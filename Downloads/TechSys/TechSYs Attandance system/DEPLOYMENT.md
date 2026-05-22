# Production Deployment Guide

## Architecture
- **Frontend**: Hosted on Hostinger (static files)
- **Backend API**: Hosted on Render or Railway
- **Database**: Supabase (PostgreSQL)

## Prerequisites

### 1. Supabase Setup
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the migration files in `supabase/migrations/`:
   - `20260504080006_cce4cb9e-41f1-4695-ad2a-fbfa28a045a7.sql` (Initial schema)
   - `20260521000000_add_otp_codes.sql` (OTP table)
4. Get your Supabase credentials:
   - Project URL: From Project Settings → API
   - Anon Key: From Project Settings → API

### 2. Backend Deployment (Render)

#### Option A: Using render.yaml (Recommended)
1. Push your code to GitHub
2. Create a new account at [render.com](https://render.com)
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml`
6. Set the following environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail app password
7. Deploy

#### Option B: Manual Setup
1. Create a Web Service on Render
2. Build Command: `cd server && npm install`
3. Start Command: `node server/server.js`
4. Set environment variables as above
5. Deploy

### 3. Frontend Deployment (Hostinger)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Update `.env.production`:
   ```
   VITE_API_URL=https://attendance-system-lo1v.onrender.com
   ```

3. Rebuild with production config:
   ```bash
   npm run build
   ```

4. Upload `dist/` folder contents to Hostinger:
   - Go to Hostinger File Manager
   - Navigate to `public_html`
   - Upload all files from `dist/`

## Environment Variables

### Backend (Render/Railway)
- `PORT`: 3001
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASS`: Your Gmail app password

### Frontend (Hostinger)
- `VITE_API_URL`: Your deployed backend URL

## Testing

1. Test backend health:
   ```
   https://attendance-system-lo1v.onrender.com/api
   ```

2. Test OTP authentication:
   - Use the frontend to send OTP
   - Verify OTP is sent to email
   - Verify OTP verification works

3. Test attendance tracking:
   - Check in/out functionality
   - Verify data is saved to Supabase

## Troubleshooting

### Backend Issues
- Check Render logs for errors
- Verify Supabase credentials are correct
- Ensure EMAIL_USER and EMAIL_PASS are set on Render

### Frontend Issues
- Verify `VITE_API_URL` is set correctly
- Check browser console for CORS errors
- Ensure backend is running and accessible

### Database Issues
- Check Supabase dashboard for connection errors
- Verify RLS policies are correctly set
- Run migrations if tables are missing

## Railway Alternative

If you prefer Railway over Render:

1. Create account at [railway.app](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database (or use Supabase)
4. Add a Node.js service
5. Set environment variables
6. Deploy

The backend code is compatible with both platforms.
