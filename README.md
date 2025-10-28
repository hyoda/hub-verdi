# 정대표의 오토플랜 (Hub Verdi)

> 김포 기반 지역 비즈니스 커뮤니티 - 개발자와 사업가의 협력으로 만드는 AI 자동화와 성장 생태계

## 🌟 프로젝트 소개

**정대표의 오토플랜**은 김포 지역을 기반으로 개발자와 사업가가 협력하여 AI 자동화와 비즈니스 성장을 만들어가는 커뮤니티 플랫폼입니다.

### 주요 특징
- 🤖 **AI 자동화**: 업무 자동화 및 효율화 솔루션
- 🌐 **지역 커뮤니티**: 김포 기반 비즈니스 네트워크
- 📈 **성장 생태계**: 개발자-사업가 협업 모델
- 📧 **뉴스레터**: 지역 비즈니스 인사이트 제공

## 🏗️ 프로젝트 구조

```
hub-verdi/
├── index.html              # 메인 랜딩 페이지
├── membership.html         # 멤버십 소개
├── benefits.html           # 혜택 안내
├── signup.html            # 가입 페이지
├── newsletter/            # 뉴스레터
│   └── autoplan_newsletter_html.html
├── api/                   # API 서버
│   ├── server.js          # Express 서버
│   ├── ecosystem.config.js # PM2 설정
│   └── .env               # 환경 변수
├── components/            # HTML 컴포넌트
├── css/                   # 스타일시트
├── js/                    # JavaScript
└── assets/               # 이미지 및 리소스
```

## 🚀 기술 스택

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Responsive Design

### Backend
- **Node.js** v22.19.0
- **Express** 4.21.2
- **Nodemailer** (이메일 발송)

### 보안
- **Helmet** (HTTP 헤더 보안)
- **express-rate-limit** (Rate Limiting)
- **CORS** (교차 출처 리소스 공유)
- Input Validation & Sanitization
- Security Logging

### 인프라
- **호스팅**: AWS Lightsail
- **웹서버**: Nginx
- **프로세스 관리**: PM2
- **배포**: GitHub Actions
- **도메인**: https://autoplan.hyoda.kr

## 📦 설치 및 실행

### 요구 사항
- Node.js v22.19.0 이상
- npm v10.9.3 이상
- PM2 (프로덕션)

### 로컬 개발

#### 1. 저장소 클론
```bash
git clone https://github.com/hyoda/hub-verdi.git
cd hub-verdi
```

#### 2. API 서버 설정
```bash
cd api
npm install
```

#### 3. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일 편집
```

#### 4. API 서버 실행
```bash
npm start
```

API 서버: http://localhost:4000

#### 5. 정적 사이트 실행
루트 디렉토리에서 `index.html`을 브라우저로 열거나 로컬 서버 사용:
```bash
python -m http.server 3000
# 또는
npx serve .
```

## 🌐 배포

상세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

### 자동 배포 (GitHub Actions)

`main` 브랜치에 푸시하면 자동으로 배포됩니다:
```bash
git push origin main
```

### 수동 배포

```bash
# 서버 접속
ssh mc-2025

# 코드 업데이트
cd /var/www/autoplan-api
git pull origin main

# 의존성 설치 및 재시작
source ~/.nvm/nvm.sh
npm install --production
pm2 restart hub-verdi-api
```

## 🔒 보안

보안 관련 상세 정보는 [SECURITY.md](./SECURITY.md)를 참고하세요.

### 주요 보안 조치
- ✅ SQL Injection 방어
- ✅ XSS 방어
- ✅ Rate Limiting (15분당 3회)
- ✅ Input Validation & Sanitization
- ✅ Security Logging
- ✅ CORS 설정
- ✅ Helmet 보안 헤더

## 📊 모니터링

### PM2 상태 확인
```bash
ssh mc-2025 "source ~/.nvm/nvm.sh && pm2 status hub-verdi-api"
```

### API 헬스체크
```bash
curl https://autoplan.hyoda.kr/api/health
```

### 로그 확인
```bash
# 실시간 로그
ssh mc-2025 "source ~/.nvm/nvm.sh && pm2 logs hub-verdi-api"

# 보안 로그
ssh mc-2025 "tail -f /var/www/autoplan-api/security.log"
```

## 📖 문서

- [배포 가이드](./DEPLOYMENT.md) - 배포 절차 및 트러블슈팅
- [보안 가이드](./SECURITY.md) - 보안 조치 및 방어 전략
- [API 문서](./api/README.md) - API 엔드포인트 및 사용법
- [빠른 보안 가이드](./api/SECURITY_QUICK_GUIDE.md) - 5분 보안 설정

## 🧪 테스트

### API 테스트
```bash
cd api

# 정상 구독 테스트
curl -X POST http://localhost:4000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"newsletter_subscription"}'

# 헬스체크
curl http://localhost:4000/health
```

## 🤝 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 👥 팀

- **개발자**: 서효다 (hdseo@devmine.co.kr)
- **대표**: 정부경

## 📞 문의

- **이메일**: team@autoplan.hyoda.kr
- **웹사이트**: https://autoplan.hyoda.kr

## 🎯 주요 기능

### 1. 뉴스레터 구독
- 김포 모델의 확산 과정 및 지역 비즈니스 인사이트 제공
- 자동 이메일 발송 시스템

### 2. 멤버십
- 지역 커뮤니티 기반 비즈니스 협업
- AI 자동화 도구 제공

### 3. 보안
- 실시간 공격 탐지 및 차단
- 상세 보안 로깅

### 4. SEO 최적화
- Naver/Google 검색 최적화
- `robots.txt`, `sitemap.xml` 관리
- 구조화된 데이터 (JSON-LD)

## 🔧 트러블슈팅

### 문제: npm: command not found
**해결**: NVM 환경 로드
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

### 문제: 포트 4000 충돌
**해결**: 프로세스 종료 후 재시작
```bash
sudo lsof -i :4000
sudo kill <PID>
pm2 restart hub-verdi-api
```

### 문제: PM2 errored 상태
**해결**: PM2 삭제 후 재시작
```bash
pm2 delete hub-verdi-api
cd /var/www/autoplan-api
pm2 start ecosystem.config.js
```

더 많은 트러블슈팅은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 📈 로드맵

- [ ] 멤버십 자동 결제 시스템
- [ ] 뉴스레터 구독자 관리 대시보드
- [ ] AI 자동화 도구 추가
- [ ] 지역 비즈니스 디렉토리
- [ ] 이벤트 캘린더

## ⚡ 성능

- **API 응답 시간**: < 100ms
- **메모리 사용량**: ~60MB
- **Uptime**: 99.9%
- **Rate Limit**: 15분당 3회 (보안)

## 🌍 지원 브라우저

- Chrome (최신 2개 버전)
- Firefox (최신 2개 버전)
- Safari (최신 2개 버전)
- Edge (최신 2개 버전)

---

**Built with ❤️ in Gimpo, Korea**

