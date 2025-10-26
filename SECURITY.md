# 보안 가이드 문서

> Hub Verdi API 서버에 적용된 보안 조치사항 및 재사용 가이드

## 📋 목차

1. [보안 개요](#보안-개요)
2. [적용된 보안 조치](#적용된-보안-조치)
3. [구현 가이드](#구현-가이드)
4. [보안 로그 분석](#보안-로그-분석)
5. [공격 대응 절차](#공격-대응-절차)
6. [체크리스트](#체크리스트)

---

## 보안 개요

### 적용 일자
- **2025년 10월 26일**

### 배경
- SQL Injection 공격 시도 탐지 (IP: 122.136.188.132)
- 자동화된 공격 도구 사용 (3초 간격)
- 악의적 페이로드: `XOR(sleep(15))`, `PG_SLEEP(15)`, `waitfor delay` 등

### 주요 공격 패턴
```
testing@example.com0"XOR(if(now()=sysdate(),sleep(15),0))XOR"Z
testing@example.comV9aEGJRs' OR 942=(SELECT 942 FROM PG_SLEEP(15))--
testing@example.com-1 waitfor delay '0:0:15' --
```

---

## 적용된 보안 조치

### 1. 입력 검증 강화

#### 악의적 패턴 탐지
```javascript
const maliciousPatterns = [
  /(\bor\b|\band\b).*?=.*?=/i,                                    // SQL OR/AND 패턴
  /sleep\s*\(|benchmark\s*\(|waitfor\s+delay/i,                 // Time-based blind SQL injection
  /union.*select|insert\s+into|drop\s+table|delete\s+from/i,    // SQL 명령어
  /xor\s*\(|pg_sleep|sys\.sleep|sys\.benchmark/i,               // Database-specific functions
  /<script|javascript:|onerror=|onload=/i,                       // XSS 패턴
  /[\'\"]\s*or\s*|\s*--|\s*#|\s*\/\*|\*\/|<|>|;/                // SQL 특수문자
];
```

#### 이메일 검증
```javascript
// RFC 5322 compliant
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validateEmail(email) {
  // 1. 타입 체크
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: '이메일 주소를 입력해주세요.' };
  }
  
  // 2. 악의적 패턴 체크
  for (const pattern of maliciousPatterns) {
    if (pattern.test(email)) {
      logSecurityEvent('WARN', 'unknown', 'Malicious email pattern detected', email);
      return { valid: false, reason: '올바른 이메일 형식이 아닙니다.' };
    }
  }
  
  // 3. 이메일 형식 검증
  if (!emailRegex.test(email)) {
    return { valid: false, reason: '올바른 이메일 주소를 입력해주세요.' };
  }
  
  // 4. 길이 제한
  if (email.length > 254) {
    return { valid: false, reason: '이메일 주소가 너무 깁니다.' };
  }
  
  return { valid: true };
}
```

### 2. Rate Limiting 강화

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 3,                     // 3 요청/15분 (기존 10에서 감소)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    logSecurityEvent('WARN', req.ip || 'unknown', 'Rate limit exceeded');
    return false;
  }
});
```

### 3. 보안 로깅 시스템

#### 로그 파일 위치
```
/var/www/autoplan-api/security.log
```

#### 로그 포맷
```
[타임스탬프] [레벨] [IP: 주소] 메시지 Payload: 데이터
```

#### 로그 레벨
- **INFO**: 정상 요청 처리
- **WARN**: 검증 실패, Rate Limit 초과
- **ERROR**: 악의적 입력 차단, 서버 오류

#### 구현
```javascript
const SECURITY_LOG_PATH = path.join(__dirname, 'security.log');

function logSecurityEvent(level, ip, message, payload = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [IP: ${ip}] ${message}${payload ? ` Payload: ${payload}` : ''}\n`;
  
  try {
    fs.appendFileSync(SECURITY_LOG_PATH, logEntry);
    console.log(`[SECURITY] [${level}] ${message}`);
  } catch (error) {
    console.error('Failed to write security log:', error.message);
  }
}
```

### 4. CORS 설정 강화

```javascript
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = ['https://autoplan.hyoda.kr'];
    
    // 개발 환경에서만 localhost 허용
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:4000');
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurityEvent('WARN', 'unknown', `CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 5. Helmet 보안 헤더

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}));
```

### 6. IP 차단 (Nginx)

#### 설정 파일
```nginx
# /etc/nginx/conf.d/blocked-ips.conf
# Block malicious IPs - SQL Injection attackers
# Added: 2025-10-26
deny 122.136.188.132;
```

#### 적용
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 구현 가이드

### 1. Node.js/Express 프로젝트에 적용

#### 필수 패키지 설치
```bash
npm install express helmet cors express-rate-limit
```

#### 기본 구조
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Helmet 보안 헤더
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}));

// 2. 악의적 패턴 정의
const maliciousPatterns = [
  /(\bor\b|\band\b).*?=.*?=/i,
  /sleep\s*\(|benchmark\s*\(|waitfor\s+delay/i,
  /union.*select|insert\s+into|drop\s+table|delete\s+from|exec\s*\(|execute/i,
  /xor\s*\(|pg_sleep|sys\.sleep|sys\.benchmark/i,
  /<script|javascript:|onerror=|onload=/i,
  /[\'\"]\s*or\s*|\s*--|\s*#|\s*\/\*|\*\/|<|>|;/
];

// 3. 보안 로깅 함수
const SECURITY_LOG_PATH = path.join(__dirname, 'security.log');

function logSecurityEvent(level, ip, message, payload = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [IP: ${ip}] ${message}${payload ? ` Payload: ${payload}` : ''}\n`;
  
  try {
    fs.appendFileSync(SECURITY_LOG_PATH, logEntry);
    console.log(`[SECURITY] [${level}] ${message}`);
  } catch (error) {
    console.error('Failed to write security log:', error.message);
  }
}

// 4. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// 5. CORS
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));

// 6. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 7. 입력 검증 함수
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: '이메일 주소를 입력해주세요.' };
  }
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(email)) {
      logSecurityEvent('WARN', 'unknown', 'Malicious email pattern detected', email);
      return { valid: false, reason: '올바른 이메일 형식이 아닙니다.' };
    }
  }
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, reason: '올바른 이메일 주소를 입력해주세요.' };
  }
  
  if (email.length > 254) {
    return { valid: false, reason: '이메일 주소가 너무 깁니다.' };
  }
  
  return { valid: true };
}

// 8. API 엔드포인트에 적용
app.post('/api/signup', limiter, async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const { email } = req.body;
    
    // 이메일 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      logSecurityEvent('WARN', clientIp, 'Signup blocked: invalid email', email);
      return res.status(400).json({ error: emailValidation.reason });
    }
    
    // 정상 처리
    logSecurityEvent('INFO', clientIp, 'Signup successful', email);
    res.json({ success: true, message: '가입이 완료되었습니다.' });
    
  } catch (error) {
    logSecurityEvent('ERROR', clientIp, 'Signup error', error.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 2. Nginx IP 차단 설정

#### Step 1: 차단 IP 설정 파일 생성
```bash
sudo nano /etc/nginx/conf.d/blocked-ips.conf
```

#### Step 2: IP 추가
```nginx
# Block malicious IPs
deny 1.2.3.4;
deny 5.6.7.8;
```

#### Step 3: 설정 검증 및 적용
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. AWS Lightsail 방화벽 설정

#### 웹 콘솔
1. AWS Lightsail 콘솔 접속
2. 인스턴스 선택
3. **Networking** 탭 클릭
4. **IPv4 Firewall** → **Add rule**
5. Custom rule로 악성 IP 차단

#### 서버 레벨 (UFW)
```bash
sudo ufw deny from 1.2.3.4 comment 'SQL Injection attacker'
sudo ufw status numbered
```

---

## 보안 로그 분석

### 로그 확인 명령어

#### 실시간 모니터링
```bash
tail -f /var/www/autoplan-api/security.log
```

#### 특정 IP 검색
```bash
grep "122.136.188.132" /var/www/autoplan-api/security.log
```

#### 공격 패턴 분석
```bash
grep "WARN\|ERROR" /var/www/autoplan-api/security.log | wc -l
```

#### 최근 24시간 공격 횟수
```bash
grep "$(date -d '24 hours ago' '+%Y-%m-%d')" /var/www/autoplan-api/security.log | grep "ERROR" | wc -l
```

### 로그 예시

#### 정상 요청
```
[2025-10-26T13:50:20.314Z] [INFO] [IP: ::ffff:127.0.0.1] Newsletter subscription successful Payload: security-test@example.com
```

#### 차단된 공격
```
[2025-10-26T13:50:08.555Z] [WARN] [IP: unknown] Malicious email pattern detected Payload: test@example.comXOR(sleep(15))
[2025-10-26T13:50:08.556Z] [WARN] [IP: ::ffff:127.0.0.1] Newsletter subscription blocked: invalid email Payload: test@example.comXOR(sleep(15))
```

#### Rate Limit 초과
```
[2025-10-26T13:50:08.551Z] [WARN] [IP: ::ffff:127.0.0.1] Rate limit exceeded
```

---

## 공격 대응 절차

### 1. 공격 탐지

#### Nginx 액세스 로그 분석
```bash
# 최근 공격 시도 확인
sudo tail -1000 /var/log/nginx/access.log | grep '/api/signup' | grep -E 'XOR|PG_SLEEP|waitfor|sleep'

# 공격자 IP 추출
sudo grep '/api/signup' /var/log/nginx/access.log | grep -E 'XOR|PG_SLEEP' | awk '{print $1}' | sort | uniq -c | sort -rn
```

#### 보안 로그 확인
```bash
grep "ERROR\|WARN" /var/www/autoplan-api/security.log | tail -50
```

### 2. IP 차단

#### 즉시 차단 (Nginx)
```bash
# 1. 차단 설정 추가
sudo bash -c 'echo "deny 공격자IP;" >> /etc/nginx/conf.d/blocked-ips.conf'

# 2. 설정 검증
sudo nginx -t

# 3. 적용
sudo systemctl reload nginx
```

#### 서버 레벨 차단 (UFW)
```bash
sudo ufw deny from 공격자IP comment 'Attack detected on 2025-10-26'
```

### 3. 피해 확인

#### 이메일 스팸 확인
관리자 이메일에서 악의적인 구독 신청이 전송되었는지 확인

#### 데이터베이스 확인
```bash
# 의심스러운 데이터 검색
grep "XOR\|PG_SLEEP\|waitfor" /var/log/hub-verdi/out-*.log
```

### 4. 보고서 작성

```markdown
## 보안 사고 보고서

### 사고 정보
- **발생 일시**: 2025-10-26 13:17:13 ~ 13:32:34
- **공격 유형**: SQL Injection (Time-based Blind)
- **공격자 IP**: 122.136.188.132 (중국)
- **공격 횟수**: 약 30회

### 공격 패턴
- XOR(sleep(15))
- PG_SLEEP(15)
- waitfor delay
- DBMS_PIPE.RECEIVE_MESSAGE

### 피해 현황
- 실제 DB 피해: 없음 (이메일 전송만 수행)
- 스팸 이메일: 약 30건

### 대응 조치
1. 입력 검증 강화 (악의적 패턴 탐지)
2. Rate Limiting: 3회/15분
3. IP 차단: 122.136.188.132
4. 보안 로깅 시스템 구축

### 재발 방지 대책
- 정기적인 보안 로그 모니터링
- 의심스러운 IP 자동 차단 시스템 구축 검토
```

---

## 체크리스트

### 개발 단계
- [ ] Helmet 보안 헤더 적용
- [ ] CORS 설정 (프로덕션: HTTPS만 허용)
- [ ] Rate Limiting 설정
- [ ] 입력 검증 함수 구현
- [ ] 보안 로깅 시스템 구축
- [ ] 에러 메시지 일반화 (공격자에게 정보 노출 방지)

### 배포 단계
- [ ] 환경 변수 설정 (.env)
- [ ] Nginx IP 차단 설정
- [ ] AWS/Lightsail 방화벽 설정
- [ ] SSL/TLS 인증서 적용
- [ ] 보안 로그 파일 권한 설정

### 운영 단계
- [ ] 보안 로그 일일 모니터링
- [ ] 주간 공격 패턴 분석
- [ ] 차단 IP 목록 관리
- [ ] Rate Limit 임계값 조정
- [ ] 정기적인 보안 패치 적용

### 모니터링
- [ ] 보안 로그 파일 크기 관리 (로테이션)
- [ ] 비정상적인 트래픽 패턴 감지
- [ ] Rate Limit 초과 빈도 분석
- [ ] 새로운 공격 패턴 업데이트

---

## 참고 자료

### 보안 관련 문서
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### 도구
- [Helmet.js](https://helmetjs.github.io/)
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit)
- [OWASP ZAP](https://www.zaproxy.org/) - 보안 취약점 스캐닝

### 테스트
```bash
# SQL Injection 테스트 (차단되어야 함)
curl -X POST https://yourdomain.com/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.comXOR(sleep(15))"}'

# 정상 요청 테스트 (성공해야 함)
curl -X POST https://yourdomain.com/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"normal@example.com"}'

# Rate Limit 테스트 (4번째부터 차단)
for i in {1..5}; do
  curl -X POST https://yourdomain.com/api/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com"}'
  echo ""
done
```

---

## 업데이트 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-10-26 | 1.0.0 | 최초 작성 - SQL Injection 방어, Rate Limiting, 보안 로깅 |

---

## 문의
보안 관련 문의: hdseo@devmine.co.kr

