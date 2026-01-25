import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { findUserByGithubId, createUser, findUserById } from './db.js';

const router = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${req.protocol}://${req.get('host')}/auth/github/callback`
    // No scope = public profile only (username, name, avatar)
  });
  
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('GitHub token error:', tokenData);
      return res.redirect(`${FRONTEND_URL}?error=token_error`);
    }
    
    // Fetch user profile from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const githubUser = await userResponse.json();
    
    // Create or update user in database
    const user = createUser(githubUser.id, githubUser.login, githubUser.name, githubUser.avatar_url);
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set cookie and redirect to frontend
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.redirect(`${FRONTEND_URL}/profile`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ success: true });
});

// Middleware to verify JWT token (required)
export function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to optionally attach user if authenticated (doesn't require auth)
export function optionalAuth(req, res, next) {
  const token = req.cookies.token;
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = findUserById(decoded.userId);
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }
  
  next();
}

export { router as authRouter };
