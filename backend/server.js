require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config/environment');
const { connectRedis } = require('./config/redis');
const MatchingService = require('./services/matchingService');
const { sendEmail } = require('./config/email');
const { specs, swaggerUi } = require('./config/swagger');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const notificationRoutes = require('./routes/notifications');
const feedbackRoutes = require('./routes/feedback');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const { authLimiter, apiLimiter, chatLimiter, passwordResetLimiter, adminLimiter, securityHeaders, csrfProtection } = require('./middleware/security/security');
const requestTracker = require('./middleware/requestTracker');
const { apiVersioning } = require('./middleware/apiVersioning');
const queryOptimizer = require('./middleware/queryOptimizer');
const memoryMonitor = require('./middleware/monitoring/memoryMonitor');
const performanceMonitor = require('./middleware/monitoring/performanceMonitor');
const gracefulShutdown = require('./middleware/gracefulShutdown');
const { cacheMiddleware } = require('./middleware/simpleCache');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [
          'https://lost-found-mcc.vercel.app',
          'https://mcc-lost-found.vercel.app', 
          'https://lost-found-79xn.onrender.com',
          /\.vercel\.app$/
        ]
      : ['http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Trust proxy for rate limiting on Render
app.set('trust proxy', 1);

// Compression middleware
app.use(compression());

// Performance and monitoring middleware
app.use(requestTracker);
app.use(memoryMonitor());
app.use(performanceMonitor());
app.use('/api', apiVersioning);
app.use('/api', queryOptimizer);

// Cache frequently accessed endpoints
app.use('/api/items/recent', cacheMiddleware(60000)); // 1 minute
app.use('/api/items/events', cacheMiddleware(300000)); // 5 minutes

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(securityHeaders);
app.use(csrfProtection);
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://lost-found-mcc.vercel.app',
      'https://mcc-lost-found.vercel.app', 
      'https://lost-found-79xn.onrender.com'
    ];
    
    // Development origins
    const devOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3001'
    ];
    
    // Strict origin checking in production
    if (config.NODE_ENV === 'production') {
      // No origin for mobile apps/Postman - allow if no origin
      if (!origin) {
        return callback(null, true);
      }
      
      // Only allow exact matches or verified Vercel subdomains
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Strict Vercel subdomain validation
      if (origin.match(/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/)) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    } else {
      // Development - allow dev origins and no origin
      if (!origin || devOrigins.includes(origin) || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours preflight cache
}));
app.use(express.json({ limit: '10mb' }));

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Initialize Redis and background services
    connectRedis();
    MatchingService.scheduleMatchUpdates();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err)
    if (config.NODE_ENV === 'production') {
      process.exit(1)
    }
  });

// Special route for first admin creation (no middleware)
app.post('/api/auth/create-first-admin', express.json(), async (req, res) => {
  try {
    const User = require('./models/User');
    const jwt = require('jsonwebtoken');
    
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin account already exists' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = new User({ name, email, password, role: 'admin' });
    await user.save();

    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'Admin created successfully',
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', apiLimiter, itemRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/homepage', cacheMiddleware(30000), require('./routes/homepage')); // 30 second cache
app.use('/api/claims', apiLimiter, require('./routes/claims'));
app.use('/api/ai', apiLimiter, require('./routes/ai-search'));
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/feedback', apiLimiter, feedbackRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/users', apiLimiter, require('./routes/users'));
app.use('/api/analytics', apiLimiter, require('./routes/analytics'));
app.use('/api/moderation', apiLimiter, require('./routes/moderation'));
app.use('/api/messaging', apiLimiter, require('./routes/messaging'));
app.use('/api/system-flow', apiLimiter, require('./routes/system-flow'));
app.use('/api/visual-ai', apiLimiter, require('./routes/visual-ai'));
app.use('/api/chat', chatLimiter, require('./routes/chat'));
app.use('/api/presence', apiLimiter, require('./routes/presence'));

// MongoDB-based chat persistence is now handled automatically
console.log('Using MongoDB for chat persistence');

// Socket.io chat handler
try {
  const { handleConnection } = require('./socket/chatHandler');
  handleConnection(io);
  console.log('Chat handler loaded successfully');
} catch (error) {
  console.error('Failed to load chat handler:', error.message);
}

// Start message cleanup job (with error handling)
try {
  const { startCleanupJob } = require('./jobs/messageCleanup');
  startCleanupJob();
} catch (error) {
  console.error('Failed to start cleanup job:', error.message);
  console.log('Server will continue without cleanup job');
}

// Root endpoint for health check
app.get('/', (req, res) => {
  res.json({
    message: 'Lost & Found API Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      items: '/api/items',
      auth: '/api/auth'
    }
  });
});

app.use('/api', healthRoutes);
// Serve uploaded images with proper error handling
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Handle missing images
app.get('/uploads/*', (req, res) => {
  res.status(404).json({ error: 'Image not found' });
});

// User search endpoint
const authMiddleware = require('./middleware/auth/authMiddleware');
const User = require('./models/User');

app.get('/api/users/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    
    const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        { $or: [{ name: searchRegex }, { email: searchRegex }] }
      ]
    }).select('name email role').limit(20).sort({ name: 1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Serve admin creation page
app.get('/create-admin', (req, res) => {
  res.sendFile(__dirname + '/create-admin.html');
});

// Error handling middleware (must be last)
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💬 Socket.io chat enabled`);
  console.log(`🧹 Message cleanup job started`);
  console.log(`📊 Performance monitoring active`);
  console.log(`🛡️  Security middleware loaded`);
  console.log(`✅ System ready`);
});

// Setup graceful shutdown
gracefulShutdown(server);