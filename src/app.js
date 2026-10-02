const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const appealRoutes = require('./routes/appealRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (avatars, post images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve static admin dashboard
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));


// Health check and root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Dollique API!',
    docs: {
      health: '/api/health',
      users: '/api/users',
      categories: '/api/categories',
      posts: '/api/posts',
      comments: '/api/comments',
      appeals: '/api/appeals',
      notifications: '/api/notifications',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Dollique API', timestamp: new Date() });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/notifications', notificationRoutes);

// Global error handler (handles Multer errors as 400 Bad Request)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || (err.message && err.message.includes('image files'))) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Server error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;