require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

// Security middleware - Enhanced
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}));

// Malicious patterns for SQL Injection and XSS detection
const maliciousPatterns = [
  /(\bor\b|\band\b).*?=.*?=/i,
  /sleep\s*\(|benchmark\s*\(|waitfor\s+delay/i,
  /union.*select|insert\s+into|drop\s+table|delete\s+from|exec\s*\(|execute/i,
  /xor\s*\(|pg_sleep|sys\.sleep|sys\.benchmark/i,
  /<script|javascript:|onerror=|onload=/i,
  /[\'\"]\s*or\s*|\s*--|\s*#|\s*\/\*|\*\/|<|>|;/
];

// RFC 5322 compliant email validation
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Security logging
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

// Rate limiting - More strict for security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Reduced from 10 to 3 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Log blocked requests
    logSecurityEvent('WARN', req.ip || 'unknown', 'Rate limit exceeded');
    return false;
  }
});

// CORS configuration - Production only, no http
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://autoplan.hyoda.kr'
    ];
    
    // Development environment - allow localhost
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

// Validation functions
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: '이메일 주소를 입력해주세요.' };
  }
  
  // Check for malicious patterns
  for (const pattern of maliciousPatterns) {
    if (pattern.test(email)) {
      logSecurityEvent('WARN', 'unknown', 'Malicious email pattern detected', email);
      return { valid: false, reason: '올바른 이메일 형식이 아닙니다.' };
    }
  }
  
  // Validate email format
  if (!emailRegex.test(email)) {
    return { valid: false, reason: '올바른 이메일 주소를 입력해주세요.' };
  }
  
  // Additional sanity checks
  if (email.length > 254) {
    return { valid: false, reason: '이메일 주소가 너무 깁니다.' };
  }
  
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length > 64 || parts[1].length > 253) {
    return { valid: false, reason: '올바른 이메일 주소를 입력해주세요.' };
  }
  
  return { valid: true };
}

function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Check for malicious patterns
  for (const pattern of maliciousPatterns) {
    if (pattern.test(input)) {
      logSecurityEvent('WARN', 'unknown', 'Malicious input detected', input);
      return ''; // Return empty string to block malicious input
    }
  }
  
  // Basic sanitization - remove potential dangerous characters
  return input.trim().substring(0, 2000); // Limit length
}

function validateAllInputs(data) {
  const ip = data._ip || 'unknown';
  
  // Validate email
  if (data.email) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      logSecurityEvent('WARN', ip, 'Email validation failed', data.email);
      return { valid: false, reason: emailValidation.reason };
    }
  }
  
  // Sanitize all string inputs
  const sanitizedData = {};
  for (const key in data) {
    if (typeof data[key] === 'string') {
      sanitizedData[key] = sanitizeInput(data[key]);
      
      // Check if sanitization removed the input (malicious)
      if (data[key] && !sanitizedData[key]) {
        logSecurityEvent('ERROR', ip, 'Malicious input blocked', `${key}: ${data[key]}`);
        return { valid: false, reason: '입력한 내용에 허용되지 않은 문자가 포함되어 있습니다.' };
      }
    } else {
      sanitizedData[key] = data[key];
    }
  }
  
  return { valid: true, sanitizedData };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Signup endpoint (accessed via nginx proxy as /signup)
app.post('/signup', limiter, async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const {
      firstName,
      phone,
      email,
      company,
      position,
      'business-type': businessType,
      region,
      experience,
      motivation,
      challenges,
      'privacy-agree': privacyAgree,
      type,
      source
    } = req.body;

    // Add IP to request data for logging
    req.body._ip = clientIp;

    // Newsletter subscription validation
    if (type === 'newsletter_subscription') {
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        logSecurityEvent('WARN', clientIp, 'Newsletter subscription blocked: invalid email', email);
        return res.status(400).json({
          error: emailValidation.reason
        });
      }

      // Additional validation: check for malicious patterns in email
      const validation = validateAllInputs({ email, source: source || 'unknown' });
      if (!validation.valid) {
        logSecurityEvent('ERROR', clientIp, 'Newsletter subscription blocked: malicious input', email);
        return res.status(400).json({
          error: validation.reason || '입력된 정보에 문제가 있습니다.'
        });
      }

      // Use sanitized email from validation
      const safeEmail = validation.sanitizedData.email || email;
      
      // Send newsletter subscription email
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@autoplan.hyoda.kr',
        to: 'hdseo@devmine.co.kr',
        subject: `[오토플랜] 뉴스레터 구독 신청 - ${safeEmail}`,
        html: `
          <h2>📧 새로운 뉴스레터 구독 신청</h2>
          <p><strong>신청일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
          <p><strong>이메일:</strong> ${safeEmail}</p>
          <p><strong>소스:</strong> ${source || '미확인'}</p>

          <hr>
          <p style="color: #666; font-size: 0.9rem;">
            * 이 이메일은 autoplan.hyoda.kr 뉴스레터 구독 폼에서 자동으로 발송되었습니다.
          </p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        logSecurityEvent('INFO', clientIp, 'Newsletter subscription successful', safeEmail);
      } catch (emailError) {
        logSecurityEvent('ERROR', clientIp, 'Newsletter email sending failed', emailError.message);
      }

      return res.json({
        success: true,
        message: '뉴스레터 구독이 완료되었습니다.'
      });
    }

    // Membership signup validation
    if (!firstName || !phone || !email || !privacyAgree) {
      logSecurityEvent('WARN', clientIp, 'Membership signup blocked: missing required fields');
      return res.status(400).json({
        error: '필수 항목을 모두 입력해주세요.'
      });
    }

    // Validate and sanitize all inputs
    const membershipValidation = validateAllInputs(req.body);
    if (!membershipValidation.valid) {
      logSecurityEvent('ERROR', clientIp, 'Membership signup blocked: validation failed');
      return res.status(400).json({
        error: membershipValidation.reason || '입력된 정보를 확인해주세요.'
      });
    }

    // Use sanitized data
    const data = membershipValidation.sanitizedData;

    // Email content - using sanitized data
    const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@autoplan.hyoda.kr',
        to: 'hdseo@devmine.co.kr', // Admin email
        subject: `[오토플랜] 새로운 멤버십 가입 신청 - ${data.firstName || firstName}님`,
        html: `
        <h2>🌱 새로운 멤버십 가입 신청</h2>
        <p><strong>신청일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
        
        <h3>📋 기본 정보</h3>
        <ul>
          <li><strong>성명:</strong> ${data.firstName || firstName}</li>
          <li><strong>연락처:</strong> ${data.phone || phone}</li>
          <li><strong>이메일:</strong> ${data.email || email}</li>
          <li><strong>회사/단체명:</strong> ${data.company || company || '미입력'}</li>
          <li><strong>직책/역할:</strong> ${data.position || position || '미입력'}</li>
        </ul>
        
        <h3>💼 비즈니스 정보</h3>
        <ul>
          <li><strong>업종:</strong> ${data['business-type'] || businessType || '미입력'}</li>
          <li><strong>지역:</strong> ${data.region || region || '미입력'}</li>
          <li><strong>사업 경험:</strong> ${data.experience || experience || '미입력'}</li>
        </ul>
        
        <h3>🎯 가입 동기 및 기대사항</h3>
        <p><strong>가입 동기:</strong> ${data.motivation || motivation || '미입력'}</p>
        <p><strong>해결하고 싶은 과제:</strong> ${data.challenges || challenges || '미입력'}</p>
        
        <hr>
        <p style="color: #666; font-size: 0.9rem;">
          * 이 이메일은 autoplan.hyoda.kr 멤버십 신청 폼에서 자동으로 발송되었습니다.
        </p>
      `,
      replyTo: data.email || email
    };

    // Try to send email, but don't fail if email fails
    try {
      await transporter.sendMail(mailOptions);
      logSecurityEvent('INFO', clientIp, 'Membership signup email sent', `${data.firstName || firstName} (${data.email || email})`);
    } catch (emailError) {
      logSecurityEvent('ERROR', clientIp, 'Membership email sending failed', emailError.message);
    }

    res.json({ 
      success: true, 
      message: '가입 신청이 완료되었습니다. 2-3일 내에 연락드리겠습니다.' 
    });

  } catch (error) {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    logSecurityEvent('ERROR', clientIp, 'Signup endpoint error', error.message);
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  logSecurityEvent('ERROR', clientIp, 'Application error', err.message);
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  logSecurityEvent('WARN', clientIp, '404 Not Found', req.originalUrl);
  res.status(404).json({ error: 'Not Found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hub Verdi API Server running on port ${PORT}`);
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? 'Yes' : 'No (using default)'}`);
  console.log(`⏰ Server started at: ${new Date().toISOString()}`);
});

module.exports = app;