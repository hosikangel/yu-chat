/**
 * LinguaTalk 시그널링 서버
 * Railway / Render 배포용
 *
 * 기능: WebRTC 시그널링 · 채팅 메시지 전달 · 헬스체크
 */

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const app    = express();
const server = http.createServer(app);

// ── 보안 미들웨어 ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.WEB_URL ?? 'https://linguatalk.vercel.app',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── 헬스체크 ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ name: 'LinguaTalk Server', version: '1.0.0', status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      process.env.WEB_URL ?? 'https://linguatalk.vercel.app',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// JWT 인증 미들웨어
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  // 개발 환경에서는 토큰 없이 허용
  if (process.env.NODE_ENV !== 'production' && !token) {
    socket.data.userId = 'dev_' + socket.id.slice(0, 8);
    return next();
  }

  if (!token) return next(new Error('AUTH_REQUIRED'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev_secret');
    socket.data.userId = payload.userId;
    socket.data.lang   = payload.lang ?? 'ko';
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
});

// 온라인 사용자 목록
const onlineUsers = new Map(); // userId → { socketId, lang }

io.on('connection', socket => {
  const userId = socket.data.userId;
  console.log(`[+] 연결: ${userId} (${socket.id})`);

  // 사용자 등록
  socket.on('register', ({ lang } = {}) => {
    onlineUsers.set(userId, { socketId: socket.id, lang: lang ?? 'ko' });
    socket.emit('registered', {
      userId,
      onlineCount: onlineUsers.size,
    });
    console.log(`[등록] ${userId} | 온라인: ${onlineUsers.size}명`);
  });

  // 온라인 여부 확인
  socket.on('check-online', ({ targetId }, callback) => {
    callback?.({ online: onlineUsers.has(targetId) });
  });

  // ── WebRTC 시그널링 ──────────────────────────────────────────────────────
  socket.on('offer', ({ to, offer, callType, fromLang }) => {
    const target = onlineUsers.get(to);
    if (!target) {
      socket.emit('call-failed', { reason: 'OFFLINE', to });
      return;
    }
    io.to(target.socketId).emit('offer', {
      from: userId,
      offer,
      callType,
      fromLang: fromLang ?? socket.data.lang,
    });
    console.log(`[Offer] ${userId} → ${to} (${callType})`);
  });

  socket.on('answer', ({ to, answer }) => {
    const target = onlineUsers.get(to);
    if (target) {
      io.to(target.socketId).emit('answer', { from: userId, answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const target = onlineUsers.get(to);
    if (target) {
      io.to(target.socketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', ({ to } = {}) => {
    if (to) {
      const target = onlineUsers.get(to);
      if (target) {
        io.to(target.socketId).emit('call-ended', { from: userId });
      }
    }
    console.log(`[종료] ${userId}`);
  });

  // ── 채팅 메시지 ──────────────────────────────────────────────────────────
  socket.on('message', ({ to, content, lang, type, msgId }) => {
    const target = onlineUsers.get(to);
    const payload = {
      msgId: msgId ?? Date.now().toString(),
      from: userId,
      content,
      lang,
      type: type ?? 'text',
      timestamp: new Date().toISOString(),
    };

    if (target) {
      io.to(target.socketId).emit('message', payload);
    } else {
      // 상대방 오프라인 → 발신자에게 알림
      socket.emit('message-failed', { msgId: payload.msgId, reason: 'OFFLINE' });
    }
  });

  // ── 연결 해제 ────────────────────────────────────────────────────────────
  socket.on('disconnect', reason => {
    onlineUsers.delete(userId);
    console.log(`[-] 해제: ${userId} (${reason}) | 온라인: ${onlineUsers.size}명`);
  });
});

// ── 서버 시작 ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================');
  console.log(`✅ LinguaTalk 서버 실행 중`);
  console.log(`   포트   : ${PORT}`);
  console.log(`   환경   : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   허용URL: ${process.env.WEB_URL ?? 'http://localhost:3000'}`);
  console.log('====================================');
});

// 예기치 않은 오류 처리 (서버 다운 방지)
process.on('uncaughtException',  err => console.error('[오류]', err.message));
process.on('unhandledRejection', err => console.error('[거부]', err));
