<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/066e3633-8ef7-4a6e-90c3-3753c0f942d4" />

# LeetGolf

A code golf competitive programming platform with GitHub OAuth login.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  GitHub Pages   │────▶│   Backend API        │────▶│   SQLite    │
│  (Frontend)     │     │  (Railway/Render)    │     │             │
└─────────────────┘     └──────────────────────┘     └─────────────┘
```

- **Frontend**: React SPA hosted on GitHub Pages
- **Backend**: Node.js/Express with SQLite, deployed to Railway/Render/Fly.io
- **Auth**: GitHub OAuth (secrets stored only on backend)

## Local Development

### 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `LeetGolf Local`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:3001/auth/github/callback`
4. Save the Client ID and Client Secret

### 2. Start Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your GitHub OAuth credentials
npm install
npm run dev
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

## Production Deployment

### Backend (Railway/Render/Fly.io)

1. Deploy the `backend/` folder to your hosting platform
2. Set environment variables:
   - `GITHUB_CLIENT_ID` - from your production GitHub OAuth App
   - `GITHUB_CLIENT_SECRET` - from your production GitHub OAuth App
   - `JWT_SECRET` - random secret string
   - `FRONTEND_URL` - your GitHub Pages URL (e.g., `https://username.github.io/leetgolf`)
   - `NODE_ENV` - set to `production`

### Frontend (GitHub Pages)

1. Update `frontend/src/api.js` with your backend URL:
   ```javascript
   export const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend.railway.app';
   ```

2. Build and deploy:
   ```bash
   cd frontend
   npm run build:gh-pages
   # Deploy dist/ folder to GitHub Pages
   ```

3. Or use GitHub Actions (create `.github/workflows/deploy.yml`)

### Production GitHub OAuth App

Create a separate OAuth App for production:
- Homepage URL: `https://username.github.io/leetgolf`
- Callback URL: `https://your-backend.railway.app/auth/github/callback`

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, React Router
- **Backend**: Node.js, Express, sql.js (SQLite)
- **Auth**: GitHub OAuth, JWT
