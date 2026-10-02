require('dotenv').config();
const app = require('./app');
const pool = require('../database/db');
const ModerationService = require('./services/moderationService');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('📦 Successfully connected to MySQL database (Dollique DB)');
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Dollique API server running at http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    });

    // Auto-delete posts whose moderation timer has expired
    ModerationService.startScheduler();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();