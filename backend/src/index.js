import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDatabase, saveSubmission, hasUserSolvedProblem, getLeaderboard, getUserSubmissions } from './db.js';
import { authRouter, authenticateToken, optionalAuth } from './auth.js';
import { runTests, runCode, getAvailableLanguages, formatUiuaCode } from './runner.js';

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

// ============================================================================
// Code Runner Endpoints
// ============================================================================

// Get available languages (which runners are installed on server)
app.get('/api/languages', (req, res) => {
  const available = getAvailableLanguages();
  res.json(available);
});

// Run code against test cases
// Body: { language: string, code: string, testCases: Array<{input, expected}> }
app.post('/api/run-tests', async (req, res) => {
  try {
    const { language, code, testCases } = req.body;
    
    if (!language || !code || !testCases) {
      return res.status(400).json({ 
        error: 'Missing required fields: language, code, testCases' 
      });
    }
    
    if (!['bqn', 'uiua', 'j', 'apl'].includes(language)) {
      return res.status(400).json({ 
        error: `Invalid language: ${language}. Must be one of: bqn, uiua, j, apl` 
      });
    }
    
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ 
        error: 'testCases must be a non-empty array' 
      });
    }
    
    const results = await runTests(language, code, testCases);
    const allPassed = results.every(r => r.passed);
    
    res.json({
      results,
      allPassed,
      passedCount: results.filter(r => r.passed).length,
      totalCount: results.length,
    });
  } catch (error) {
    console.error('Error running tests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Format Uiua code (convert ASCII names to Unicode symbols)
// Body: { code: string }
app.post('/api/format-uiua', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing code field' });
    }
    
    const result = await formatUiuaCode(code);
    res.json(result);
  } catch (error) {
    console.error('Error formatting Uiua:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Run code once (for REPL/playground use)
// Body: { language: string, code: string, input: string }
app.post('/api/run', async (req, res) => {
  try {
    const { language, code, input } = req.body;
    
    if (!language || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields: language, code' 
      });
    }
    
    if (!['bqn', 'uiua', 'j', 'apl'].includes(language)) {
      return res.status(400).json({ 
        error: `Invalid language: ${language}. Must be one of: bqn, uiua, j, apl` 
      });
    }
    
    const result = await runCode(language, code, input || '');
    res.json(result);
  } catch (error) {
    console.error('Error running code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Submissions & Leaderboard Endpoints
// ============================================================================

// Submit a successful solution (requires authentication)
// Body: { problemSlug: string, language: string, solution: string, charCount: number }
app.post('/api/submissions', authenticateToken, (req, res) => {
  try {
    const { problemSlug, language, solution, charCount } = req.body;
    
    if (!problemSlug || !language || !solution || typeof charCount !== 'number') {
      return res.status(400).json({ 
        error: 'Missing required fields: problemSlug, language, solution, charCount' 
      });
    }
    
    if (!['bqn', 'uiua', 'j', 'apl'].includes(language)) {
      return res.status(400).json({ 
        error: `Invalid language: ${language}` 
      });
    }
    
    const submission = saveSubmission(req.user.id, problemSlug, language, solution, charCount);
    
    if (submission) {
      res.json({ success: true, submission, isNew: true });
    } else {
      // Duplicate solution
      res.json({ success: true, isNew: false, message: 'Solution already submitted' });
    }
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if current user has solved a problem
app.get('/api/problems/:slug/solved', optionalAuth, (req, res) => {
  const { slug } = req.params;
  
  if (!req.user) {
    return res.json({ solved: false, authenticated: false });
  }
  
  const solved = hasUserSolvedProblem(req.user.id, slug);
  const submissions = getUserSubmissions(req.user.id, slug);
  
  res.json({ 
    solved, 
    authenticated: true,
    submissions
  });
});

// Get leaderboard for a problem (requires user to have solved it)
app.get('/api/problems/:slug/leaderboard', optionalAuth, (req, res) => {
  const { slug } = req.params;
  
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const solved = hasUserSolvedProblem(req.user.id, slug);
  
  if (!solved) {
    return res.status(403).json({ 
      error: 'You must solve this problem before viewing the leaderboard',
      solved: false
    });
  }
  
  const leaderboard = getLeaderboard(slug);
  
  res.json({ 
    leaderboard,
    solved: true
  });
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
