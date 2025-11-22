# Deployment Guide for Clinical Extractor

Complete deployment instructions for 6 platforms + Docker.

---

## 📋 Quick Reference

| Platform | Cost | Setup Time | Best For | Backend Support |
|----------|------|------------|----------|-----------------|
| **Render.com** ⭐ | FREE | 15 min | Production (recommended) | ✅ Yes |
| **Vercel** | FREE | 5 min | Quick demos | ❌ No |
| **GitHub Pages** | FREE | 10 min | Static frontend | ❌ No |
| **Railway** | $5 trial | 10 min | Full control | ✅ Yes |
| **Fly.io** | FREE tier | 20 min | Global edge | ✅ Yes |
| **AWS Lightsail** | $3.50/mo | 30 min | Self-hosted | ✅ Yes |
| **Hugging Face Spaces** 🤗 | FREE | 25 min | ML/AI community | ✅ Yes |
| **Docker** 🐳 | Varies | 10 min | Any platform | ✅ Yes |

---

## 🚀 Deployment Instructions

### 1. Render.com (Recommended) ⭐

**FREE backend + frontend hosting with production security**

#### Setup (15 minutes):

```bash
# 1. Push render.yaml to GitHub (already done)
git add render.yaml
git commit -m "feat: Add Render.com configuration"
git push

# 2. Sign up at render.com with GitHub
# 3. Click "New +" → "Blueprint"
# 4. Select your repository (a_consulta)
# 5. Render auto-detects render.yaml
```

#### Add Environment Variables:

1. Go to Backend service → Environment
2. Add secret: `GEMINI_API_KEY=your_key_here`
3. Services will auto-deploy

#### URLs:
- **Frontend**: `https://clinical-extractor-frontend.onrender.com`
- **Backend**: `https://clinical-extractor-backend.onrender.com`
- **API Docs**: `https://clinical-extractor-backend.onrender.com/docs`

#### Pros:
- ✅ True free tier (not trial)
- ✅ Backend + frontend included
- ✅ API keys secure on backend
- ✅ Auto HTTPS + custom domains
- ✅ Auto-deploy on git push

#### Cons:
- ⚠️ Spins down after 15 min inactivity (cold starts ~30s)

---

### 2. Vercel (Quickest Demo)

**Frontend-only deployment in 5 minutes**

#### Setup:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or: Connect GitHub repo at vercel.com
```

#### Add Environment Variables:

```bash
# Via CLI
vercel env add VITE_GEMINI_API_KEY production

# Or via dashboard: vercel.com → Project → Settings → Environment Variables
```

#### URL:
- **Frontend**: `https://clinical-extractor.vercel.app`

#### Pros:
- ✅ Instant deployment
- ✅ Global CDN
- ✅ Auto HTTPS

#### Cons:
- ⚠️ **API key exposed in frontend bundle** (NOT production-safe)
- ❌ No backend hosting on free tier

---

### 3. GitHub Pages (Free Static Site)

**Simple static hosting for public demos**

#### Setup:

```bash
# Already configured! Workflow exists at:
# .github/workflows/deploy-gh-pages.yml

# Just push to master
git push origin master

# Enable GitHub Pages:
# 1. Go to GitHub repo → Settings → Pages
# 2. Source: "GitHub Actions"
# 3. Wait for workflow to complete
```

#### Add Environment Variables:

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add repository secret: `VITE_GEMINI_API_KEY`

#### URL:
- **Frontend**: `https://mmrech.github.io/a_consulta/`

#### Pros:
- ✅ Free for public repos
- ✅ Simple setup

#### Cons:
- ⚠️ API key exposed in bundle
- ❌ No backend
- ❌ No custom domain on free tier

---

### 4. Railway.app (Best for Docker)

**$5 trial credit, excellent Docker support**

#### Setup:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Or: Connect GitHub at railway.app
```

#### Configuration Files:
- `railway.json` - Frontend config
- `railway.toml` - Advanced config
- `backend/railway.toml` - Backend config

#### Add Environment Variables:

```bash
# Via CLI
railway variables set GEMINI_API_KEY=your_key

# Or via dashboard: railway.app → Project → Variables
```

#### Pros:
- ✅ Perfect Docker Compose support
- ✅ PostgreSQL/Redis included
- ✅ Easy scaling

#### Cons:
- ⚠️ $5 trial (500 hours/month per service)
- ⚠️ Requires credit card

---

### 5. Fly.io (Global Edge Deployment)

**FREE tier with global edge locations**

#### Setup:

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy frontend
flyctl launch
# Follow prompts, use fly.toml config

# Deploy backend
cd backend
flyctl launch
# Follow prompts, use backend/fly.toml

# Add secrets
flyctl secrets set GEMINI_API_KEY=your_key
```

#### Configuration Files:
- `fly.toml` - Frontend config
- `backend/fly.toml` - Backend config

#### Pros:
- ✅ Excellent Docker support
- ✅ Global edge deployment (low latency)
- ✅ PostgreSQL included

#### Cons:
- ⚠️ Requires credit card (but stays in free tier)
- ⚠️ More complex setup

#### Free Tier:
- 3 shared VMs (256MB RAM each)
- 3GB storage
- 160GB bandwidth/month

---

### 6. AWS Lightsail (Self-Hosted)

**Full control, $3.50/month**

#### Setup:

```bash
# 1. Create Lightsail instance
# Go to: https://lightsail.aws.amazon.com/
# - Choose "OS Only" → Ubuntu 22.04
# - Select $3.50/month plan
# - Download SSH key pair

# 2. Configure SSH key
mv ~/Downloads/lightsail-key.pem ~/.ssh/
chmod 400 ~/.ssh/lightsail-key.pem

# 3. Install Docker on Lightsail instance
ssh -i ~/.ssh/lightsail-key.pem ubuntu@<LIGHTSAIL-IP>
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
exit

# 4. Deploy with script
chmod +x lightsail-deploy.sh
./lightsail-deploy.sh <LIGHTSAIL-IP>
```

#### Pros:
- ✅ Full control
- ✅ Predictable pricing ($3.50/mo)
- ✅ No cold starts
- ✅ SSH access

#### Cons:
- ⚠️ Not free
- ⚠️ Manual scaling
- ⚠️ You manage updates

---

## 🐳 Docker Deployment (Any Platform)

**Deploy anywhere with Docker support**

### Local Testing:

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and add GEMINI_API_KEY

# 2. Build and start
docker-compose up -d --build

# 3. Verify
docker-compose ps
docker-compose logs -f

# 4. Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8000/docs
```

### Production Deployment:

```bash
# Build production images
docker build -t clinical-extractor-frontend:prod -f Dockerfile.frontend .
docker build -t clinical-extractor-backend:prod -f backend/Dockerfile backend/

# Push to registry (Docker Hub, AWS ECR, Google GCR)
docker tag clinical-extractor-frontend:prod your-registry/clinical-extractor-frontend:latest
docker push your-registry/clinical-extractor-frontend:latest

# Deploy to any Docker host
docker run -d -p 80:80 your-registry/clinical-extractor-frontend:latest
docker run -d -p 8000:8000 \
  -e GEMINI_API_KEY=your_key \
  your-registry/clinical-extractor-backend:latest
```

---

## 🔒 Security Best Practices

### Environment Variables:

**NEVER commit these to git:**
```bash
# .env (already in .gitignore)
GEMINI_API_KEY=your_actual_key_here
```

**Add via platform dashboards:**
- Render: Dashboard → Environment → Add Variable
- Vercel: Dashboard → Settings → Environment Variables
- Railway: CLI → `railway variables set KEY=value`
- Fly.io: CLI → `flyctl secrets set KEY=value`
- GitHub: Settings → Secrets → Actions secrets

### Frontend vs Backend API Keys:

**❌ NEVER expose in frontend:**
```javascript
// BAD - API key in frontend bundle
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
```

**✅ Always use backend:**
```typescript
// GOOD - Backend handles API key
const response = await fetch('https://backend.com/api/generate-pico', {
  method: 'POST',
  body: JSON.stringify({ pdf_text })
});
```

---

## 📊 Platform Comparison

### For Production: ✅ **Render.com**
- Best balance of features, ease, and cost (FREE)
- Backend + frontend included
- Secure API key handling

### For Quick Demos: ✅ **Vercel**
- Fastest deployment (5 min)
- Only for non-sensitive demos

### For Full Control: ✅ **Fly.io or AWS Lightsail**
- Fly.io: Global edge, free tier
- Lightsail: Predictable pricing, SSH access

### For Open Source: ✅ **GitHub Pages**
- Free for public repos
- Good for documentation sites

---

## 🚨 Common Issues

### Issue 1: Backend not responding
```bash
# Check backend is running
docker-compose ps

# View logs
docker-compose logs backend

# Verify GEMINI_API_KEY is set
docker-compose exec backend env | grep GEMINI
```

### Issue 2: CORS errors
```bash
# Update backend/.env
CORS_ORIGINS=https://your-frontend-url.com

# Restart backend
docker-compose restart backend
```

### Issue 3: Cold starts on Render.com
```bash
# Keep backend warm (optional)
# Use a cron job to ping every 14 minutes:
curl https://clinical-extractor-backend.onrender.com/health
```

---

## 📚 Additional Resources

- **Render.com Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Fly.io Docs**: https://fly.io/docs
- **Railway Docs**: https://docs.railway.app
- **Docker Docs**: https://docs.docker.com

---

**Last Updated**: November 19, 2025
**Tested Platforms**: All 6 platforms verified working
**Status**: ✅ Production-ready
