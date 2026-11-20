import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import businessRoutes from './routes/business.js';
import homeRoutes from './routes/home.js';
import paymentRoutes, { webhookHandler } from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import directoryRoutes from './routes/directory.js';
import shareRoutes from './routes/share.js';

const app = express();
app.set('trust proxy', 1);
const isLocalDevelopmentRequest = (req) => {
  if (process.env.NODE_ENV !== 'development') return false;
  const address = req.socket.remoteAddress || '';
  return address === '::1' || /^127\./.test(address) || /^::ffff:127\./.test(address);
};

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || env.clientUrls.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
}));
app.use(compression());
if (!env.isProd) app.use(morgan('dev'));

// Razorpay webhook needs the RAW body for signature verification – must come before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), webhookHandler);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
// Supabase may send confirmation links to its configured Site URL when an
// older email template omits redirectTo. Keep that fallback on the frontend.
app.get('/', (req, res) => res.redirect(302, `${env.frontendUrl}/#/auth/verified`));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, try again later' }, skip: isLocalDevelopmentRequest });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, skip: isLocalDevelopmentRequest });

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/directory', directoryRoutes);
app.use('/api/share', shareRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
