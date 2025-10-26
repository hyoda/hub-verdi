# API 보안 빠른 가이드

> 다른 프로젝트에 신속하게 적용할 수 있는 보안 체크리스트

## 🚀 5분 안에 적용하기

### 1. 패키지 설치
```bash
npm install helmet cors express-rate-limit
```

### 2. 코드 복사 (server.js 상단에 추가)

```javascript
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

// Helmet 적용
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}));

// 악의적 패턴 (복사해서 사용)
const maliciousPatterns = [
  /(\bor\b|\band\b).*?=.*?=/i,
  /sleep\s*\(|benchmark\s*\(|waitfor\s+delay/i,
  /union.*select|insert\s+into|drop\s+table|delete\s+from|exec\s*\(|execute/i,
  /xor\s*\(|pg_sleep|sys\.sleep|sys\.benchmark/i,
  /<script|javascript:|onerror=|onload=/i,
  /[\'\"]\s*or\s*|\s*--|\s*#|\s*\/\*|\*\/|<|>|;/
];

// 보안 로깅
const SECURITY_LOG_PATH = path.join(__dirname, 'security.log');

function logSecurityEvent(level, ip, message, payload = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [IP: ${ip}] ${message}${payload ? ` Payload: ${payload}` : ''}\n`;
  fs.appendFileSync(SECURITY_LOG_PATH, logEntry);
  console.log(`[SECURITY] [${level}] ${message}`);
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many requests from this IP, please try again later.'
});

// CORS
app.use(cors({
  origin: ['https://yourdomain.com'], // 여기를 본인 도메인으로 변경
  credentials: true
}));

// 이메일 검증 함수
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
```

### 3. API 엔드포인트에 적용

```javascript
app.post('/api/signup', limiter, async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const { email } = req.body;
    
    // ✅ 이메일 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      logSecurityEvent('WARN', clientIp, 'Signup blocked: invalid email', email);
      return res.status(400).json({ error: emailValidation.reason });
    }
    
    // ✅ 정상 처리
    logSecurityEvent('INFO', clientIp, 'Signup successful', email);
    res.json({ success: true });
    
  } catch (error) {
    logSecurityEvent('ERROR', clientIp, 'Signup error', error.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});
```

---

## 🛡️ Nginx IP 차단

```bash
# 1. 차단 파일 생성
sudo nano /etc/nginx/conf.d/blocked-ips.conf

# 2. IP 추가
deny 1.2.3.4;
deny 5.6.7.8;

# 3. 적용
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📊 모니터링

### 실시간 보안 로그
```bash
tail -f security.log
```

### 공격 시도 횟수
```bash
grep "WARN\|ERROR" security.log | wc -l
```

### 공격자 IP 추출
```bash
sudo grep '/api/signup' /var/log/nginx/access.log | \
  grep -E 'XOR|PG_SLEEP|waitfor|sleep' | \
  awk '{print $1}' | sort | uniq -c | sort -rn
```

---

## ✅ 테스트

### 악의적 요청 (차단되어야 함)
```bash
curl -X POST https://yourdomain.com/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.comXOR(sleep(15))"}'

# 기대 결과: {"error":"올바른 이메일 형식이 아닙니다."}
```

### 정상 요청 (성공해야 함)
```bash
curl -X POST https://yourdomain.com/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"normal@example.com"}'

# 기대 결과: {"success":true}
```

### Rate Limit 테스트 (4번째 차단)
```bash
for i in {1..5}; do
  curl -X POST https://yourdomain.com/api/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com"}'
  echo ""
done

# 기대 결과: 처음 3개 성공, 4번째부터 429 에러
```

---

## 🔥 긴급 대응

### 공격 탐지 시
```bash
# 1. 공격자 IP 확인
sudo tail -1000 /var/log/nginx/access.log | grep '/api/signup' | \
  grep -E 'XOR|PG_SLEEP' | awk '{print $1}' | sort | uniq

# 2. 즉시 차단
sudo bash -c 'echo "deny 공격자IP;" >> /etc/nginx/conf.d/blocked-ips.conf'
sudo systemctl reload nginx

# 3. 로그 확인
tail -50 security.log
```

---

## 📋 체크리스트

배포 전 확인사항:
- [ ] Helmet 적용
- [ ] CORS 도메인 설정 (프로덕션: HTTPS만)
- [ ] Rate Limiting 적용
- [ ] 입력 검증 함수 적용
- [ ] 보안 로깅 확인
- [ ] 테스트 완료
- [ ] SSL/TLS 인증서 적용

---

## 💡 추가 보안 팁

### 1. 환경 변수 사용
```javascript
// ❌ 나쁜 예
const SECRET = 'my-secret-key';

// ✅ 좋은 예
const SECRET = process.env.SECRET_KEY;
```

### 2. 에러 메시지 일반화
```javascript
// ❌ 나쁜 예
res.status(400).json({ error: 'SQL syntax error at position 15' });

// ✅ 좋은 예
res.status(400).json({ error: '입력된 정보를 확인해주세요.' });
```

### 3. 민감한 정보 로깅 금지
```javascript
// ❌ 나쁜 예
console.log('Password:', req.body.password);

// ✅ 좋은 예
console.log('Login attempt:', req.body.email);
```

---

## 🔗 참고

- 상세 문서: [SECURITY.md](../SECURITY.md)
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html

