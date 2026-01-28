const cron = require('node-cron');
const chatCleanup = require('../utils/chatCleanup');

// Run cleanup daily at 2 AM
const scheduleCleanup = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running scheduled chat cleanup...');
    try {
      await chatCleanup.runCleanup();
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  });

  console.log('📅 Chat cleanup scheduled to run daily at 2 AM');
};

module.exports = { scheduleCleanup };