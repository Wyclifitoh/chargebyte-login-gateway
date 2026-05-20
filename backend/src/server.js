const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const stationRoutes = require('./routes/station.routes');
const machineRoutes = require('./routes/machine.routes');
const rentalRoutes = require('./routes/rental.routes');
const transactionRoutes = require('./routes/transaction.routes');
const campaignRoutes = require('./routes/campaign.routes');
const auditRoutes = require('./routes/audit.routes');
const operationRoutes = require('./routes/operation.routes');
const notificationRoutes = require('./routes/notification.routes');
const revenueRoutes = require('./routes/revenue.routes');
const partnerRoutes = require('./routes/partner.routes');
const eventRoutes = require('./routes/event.routes');
const activationRoutes = require('./routes/activation.routes');
const overviewRoutes = require('./routes/overview.routes');
const mpesaRoutes = require('./routes/mpesa.routes');
const mpesaPublicRoutes = require('./routes/mpesa-public.routes');
const adClientRoutes = require('./routes/adclient.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// Security middleware
app.use(helmet());
app.use(hpp());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/activations', activationRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/advertising-clients', adClientRoutes);
// Public M-Pesa callbacks (Safaricom hits these — no auth)
app.use('/api/public/mpesa', mpesaPublicRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ChargeByte API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
