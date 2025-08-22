# Vercel Environment Setup Guide

## Step 1: Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following environment variables:

```
MONGODB_URI=mongodb+srv://dschiffer12:fpTlLKQ9Erf7FhQn@cluster0.d5vnh9e.mongodb.net/
JWT_SECRET=fd239fc9ab248478b06d53ea94d0280f
NODE_ENV=production
CLIENT_URL=https://your-vercel-app-name.vercel.app
```

## Step 2: Update Client Environment

Replace `your-vercel-app-name` in `client/.env.production` with your actual Vercel app name.

## Step 3: Redeploy

After setting the environment variables, redeploy your application.

## Step 4: Test the API

Visit: `https://your-vercel-app-name.vercel.app/api/health`

You should see a JSON response with status "OK".

## Step 5: Test Login

Try logging in with your existing credentials. The API should now work properly.

## Alternative: Deploy Backend Separately

If you prefer to keep your backend separate, deploy it to:
- Railway (recommended for simplicity)
- Render
- Heroku
- DigitalOcean

Then update `client/.env.production` to point to your backend URL.
