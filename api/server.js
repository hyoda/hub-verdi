const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 4000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration
app.use(cors({
  origin: ['https://autoplan.hyoda.kr', 'http://autoplan.hyoda.kr', 'http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email configuration (using environment variables for security)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Membership signup endpoint
app.post('/api/signup', limiter, async (req, res) => {
  try {
    const {
      firstName,
      phone,
      email,
      company,
      businessType,
      region,
      businessSize,
      experience,
      interests,
      goals,
      challenges,
      'privacy-agree': privacyAgree
    } = req.body;

    // Validation
    if (!firstName || !phone || !email || !privacyAgree) {
      return res.status(400).json({ 
        error: '필수 항목을 모두 입력해주세요.' 
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ 
        error: '올바른 이메일 주소를 입력해주세요.' 
      });
    }

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@autoplan.hyoda.kr',
      to: 'hdseo@devmine.co.kr', // Admin email
      subject: `[오토플랜] 새로운 멤버십 가입 신청 - ${firstName}님`,
      html: `
        <h2>🌱 새로운 멤버십 가입 신청</h2>
        <p><strong>신청일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
        
        <h3>📋 기본 정보</h3>
        <ul>
          <li><strong>성명:</strong> ${firstName}</li>
          <li><strong>연락처:</strong> ${phone}</li>
          <li><strong>이메일:</strong> ${email}</li>
          <li><strong>회사/단체명:</strong> ${company || '미입력'}</li>
        </ul>
        
        <h3>💼 비즈니스 정보</h3>
        <ul>
          <li><strong>업종:</strong> ${businessType || '미입력'}</li>
          <li><strong>지역:</strong> ${region || '미입력'}</li>
          <li><strong>사업 규모:</strong> ${businessSize || '미입력'}</li>
          <li><strong>사업 경험:</strong> ${experience || '미입력'}</li>
        </ul>
        
        <h3>🎯 관심사 및 목표</h3>
        <ul>
          <li><strong>관심 분야:</strong> ${interests || '미입력'}</li>
          <li><strong>목표:</strong> ${goals || '미입력'}</li>
          <li><strong>해결하고 싶은 과제:</strong> ${challenges || '미입력'}</li>
        </ul>
        
        <hr>
        <p style="color: #666; font-size: 0.9rem;">
          * 이 이메일은 autoplan.hyoda.kr 멤버십 신청 폼에서 자동으로 발송되었습니다.
        </p>
      `,
      replyTo: email
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`New signup: ${firstName} (${email}) at ${new Date().toISOString()}`);

    res.json({ 
      success: true, 
      message: '가입 신청이 완료되었습니다. 2-3일 내에 연락드리겠습니다.' 
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hub Verdi API Server running on port ${PORT}`);
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? 'Yes' : 'No (using default)'}`);
});

module.exports = app;