# Hub Verdi API

> 뉴스레터 구독 및 멤버십 가입 API 서버

## 📋 개요

Hub Verdi (정대표의 오토플랜) 웹사이트를 위한 백엔드 API 서버입니다.

### 주요 기능
- 뉴스레터 구독 신청
- 멤버십 가입 신청
- 이메일 자동 발송 (Nodemailer)
- 보안 강화 (SQL Injection, XSS 방어)
- Rate Limiting
- 보안 로깅

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.x 이상
- PM2 (프로덕션 배포)
- Gmail 계정 (이메일 발송용)

### 설치

```bash
cd api
npm install
```

### 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
NODE_ENV=production
```

**Gmail App Password 생성:**
1. Google 계정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. `EMAIL_PASS`에 입력

### 개발 모드 실행

```bash
npm run dev
```

### 프로덕션 배포

```bash
# PM2로 시작
pm2 start server.js --name hub-verdi-api

# 재시작
pm2 restart hub-verdi-api

# 로그 확인
pm2 logs hub-verdi-api
```

## 🔒 보안

### 적용된 보안 조치

- **SQL Injection 방어**: 악의적 패턴 자동 탐지 및 차단
- **XSS 방어**: 스크립트 삽입 차단
- **Rate Limiting**: 15분당 3회 요청 제한
- **CORS**: HTTPS 도메인만 허용
- **Helmet**: 보안 헤더 적용
- **입력 검증**: RFC 5322 이메일 검증
- **보안 로깅**: 모든 공격 시도 기록

### 보안 문서
- [상세 보안 가이드](../SECURITY.md)
- [빠른 적용 가이드](./SECURITY_QUICK_GUIDE.md)

### 보안 로그 확인

```bash
# 실시간 모니터링
tail -f security.log

# 공격 시도 확인
grep "WARN\|ERROR" security.log
```

## 📡 API 엔드포인트

### Health Check
```bash
GET /health
```

**응답:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-26T13:50:43.378Z"
}
```

### 뉴스레터 구독
```bash
POST /signup
Content-Type: application/json

{
  "type": "newsletter_subscription",
  "email": "user@example.com",
  "source": "autoplan_newsletter"
}
```

**성공 응답:**
```json
{
  "success": true,
  "message": "뉴스레터 구독이 완료되었습니다."
}
```

**실패 응답:**
```json
{
  "error": "올바른 이메일 주소를 입력해주세요."
}
```

### 멤버십 가입
```bash
POST /signup
Content-Type: application/json

{
  "firstName": "홍길동",
  "phone": "010-1234-5678",
  "email": "user@example.com",
  "company": "회사명",
  "position": "직책",
  "business-type": "retail",
  "region": "gyeonggi",
  "experience": "1-3",
  "motivation": "가입 동기",
  "challenges": "해결하고 싶은 과제",
  "privacy-agree": true
}
```

**성공 응답:**
```json
{
  "success": true,
  "message": "가입 신청이 완료되었습니다. 2-3일 내에 연락드리겠습니다."
}
```

## 🧪 테스트

### 정상 요청 테스트
```bash
curl -X POST https://autoplan.hyoda.kr/api/signup \
  -H "Content-Type: application/json" \
  -d '{"type":"newsletter_subscription","email":"test@example.com"}'
```

### SQL Injection 차단 테스트
```bash
curl -X POST https://autoplan.hyoda.kr/api/signup \
  -H "Content-Type: application/json" \
  -d '{"type":"newsletter_subscription","email":"test@example.comXOR(sleep(15))"}'

# 기대 결과: {"error":"올바른 이메일 형식이 아닙니다."}
```

### Rate Limit 테스트
```bash
for i in {1..5}; do
  curl -X POST https://autoplan.hyoda.kr/api/signup \
    -H "Content-Type: application/json" \
    -d '{"type":"newsletter_subscription","email":"test'$i'@example.com"}'
  echo ""
done

# 4번째 요청부터 차단됨
```

## 📊 모니터링

### PM2 모니터링
```bash
# 프로세스 상태
pm2 status hub-verdi-api

# 실시간 로그
pm2 logs hub-verdi-api

# 리소스 모니터링
pm2 monit
```

### Nginx 로그
```bash
# 액세스 로그
sudo tail -f /var/log/nginx/access.log | grep '/api/signup'

# 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### 보안 로그 분석
```bash
# 일일 공격 시도 횟수
grep "$(date '+%Y-%m-%d')" security.log | grep "WARN\|ERROR" | wc -l

# 공격자 IP 추출
grep "ERROR" security.log | grep -oP 'IP: \K[^\]]+' | sort | uniq -c | sort -rn

# 최근 1시간 공격 패턴
grep "$(date -d '1 hour ago' '+%Y-%m-%d')" security.log | grep "Malicious"
```

## 🛠️ 트러블슈팅

### 502 Bad Gateway
```bash
# PM2 프로세스 확인
pm2 status hub-verdi-api

# 프로세스가 중지된 경우
pm2 restart hub-verdi-api

# 로그 확인
pm2 logs hub-verdi-api --lines 50
```

### 이메일 발송 실패
```bash
# 환경 변수 확인
echo $EMAIL_USER
echo $EMAIL_PASS

# Gmail App Password 재생성 필요
```

### Rate Limit 해제
```bash
# PM2 재시작 (메모리 초기화)
pm2 restart hub-verdi-api
```

## 📁 프로젝트 구조

```
api/
├── server.js              # 메인 서버 파일
├── security.log           # 보안 이벤트 로그
├── package.json           # 의존성 관리
├── .env                   # 환경 변수 (git ignore)
├── ecosystem.config.js    # PM2 설정
├── README.md              # 이 파일
└── SECURITY_QUICK_GUIDE.md # 보안 빠른 가이드
```

## 🔧 의존성

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "nodemailer": "^6.9.7",
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.10.0",
  "dotenv": "^16.3.1"
}
```

## 📝 변경 이력

### v1.1.0 (2025-10-26)
- ✅ SQL Injection 방어 추가
- ✅ XSS 방어 추가
- ✅ Rate Limiting 강화 (3회/15분)
- ✅ 보안 로깅 시스템 구축
- ✅ CORS 설정 강화
- ✅ Helmet CSP 적용
- ✅ IP 차단 시스템 (Nginx)

### v1.0.0 (2024-12-04)
- 🎉 최초 릴리스
- 뉴스레터 구독 기능
- 멤버십 가입 기능
- 이메일 자동 발송

## 🤝 기여

보안 이슈 발견 시:
1. **공개하지 말고** hdseo@devmine.co.kr로 직접 연락
2. 이슈 내용과 재현 방법 설명
3. 패치 확인 후 공개

일반 이슈:
- GitHub Issues 사용
- Pull Request 환영

## 📞 문의

- **개발자**: 서효다
- **이메일**: hdseo@devmine.co.kr
- **웹사이트**: https://autoplan.hyoda.kr

## 📄 라이센스

MIT License

Copyright (c) 2025 Hub Verdi (정대표의 오토플랜)

---

## 🔗 관련 링크

- [메인 웹사이트](https://autoplan.hyoda.kr)
- [뉴스레터](https://autoplan.hyoda.kr/newsletter/autoplan_newsletter_html.html)
- [보안 가이드](../SECURITY.md)
- [빠른 가이드](./SECURITY_QUICK_GUIDE.md)

