const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// System health metrics
const getSystemHealth = () => {
  const memUsage = process.memoryUsage();
  const dbStatus = mongoose.connection.readyState;
  const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  
  return {
    status: dbStatus === 1 ? 'healthy' : 'unhealthy',
    service: 'MCC Lost & Found API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024)
    },
    database: statusMap[dbStatus],
    environment: process.env.NODE_ENV || 'development'
  };
};

// Basic health check
router.get('/health', (req, res) => {
  res.json(getSystemHealth());
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  try {
    const health = getSystemHealth();
    
    // Test database connection
    const dbTest = await mongoose.connection.db.admin().ping();
    health.database_ping = dbTest.ok === 1;
    
    // Check services
    health.services = {
      mongodb: health.database === 'connected',
      cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
    };
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Kubernetes readiness probe
router.get('/ready', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// Kubernetes liveness probe
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

module.exports = router;