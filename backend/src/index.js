import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDatabase } from './db.js';
import { authRouter, authenticateToken } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/auth', authRouter);

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'You are authenticated!', user: req.user });
});

// Initialize database then start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
