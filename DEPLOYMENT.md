# Deployment Guide: Vercel (Frontend) & Azure (Backend)

## Overview
- **Frontend**: Deployed to Vercel (Next.js)
- **Backend**: Deployed to Azure App Service (Node.js)
- **Database**: MongoDB (Atlas or Azure Cosmos DB)

---

## 1. Frontend Deployment to Vercel

### Prerequisites
- Vercel account: https://vercel.com/sign-up
- GitHub account (repository must be public or connected to Vercel)

### Step 1: Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Select your GitHub repository `Chat_India`
4. Click "Import"

### Step 2: Configure Environment Variables

On the Vercel dashboard, go to **Project Settings → Environment Variables** and add:

| Variable | Value | Example |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | Your Azure backend URL | `https://chatindia-backend.azurewebsites.net/api` |
| `BACKEND_URL` | Your Azure backend URL | `https://chatindia-backend.azurewebsites.net` |

### Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete (typically 2-3 minutes)
3. Your frontend is now live at: `https://chat-india.vercel.app`

**Important**: Update `BACKEND_URL` environment variable after getting your Azure backend URL.

---

## 2. Backend Deployment to Azure

### Prerequisites
- Azure account: https://azure.microsoft.com/free
- Azure CLI installed locally or use Azure Cloud Shell
- Node.js 18+ (runtime handled by Azure)

### Step 1: Create Azure App Service

**Option A: Using Azure Portal**

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "App Service" and click Create
4. Fill in details:
   - **Resource Group**: Create new (e.g., `chat-india-rg`)
   - **Name**: `chatindia-backend` (must be globally unique)
   - **Publish**: Code
   - **Runtime stack**: Node 18 LTS
   - **Operating System**: Linux
   - **Region**: Choose closest to users

5. Click "Review + Create" → "Create"

**Option B: Using Azure CLI**

```bash
# Login to Azure
az login

# Create resource group
az group create --name chat-india-rg --location eastus

# Create App Service Plan
az appservice plan create \
  --name chat-india-plan \
  --resource-group chat-india-rg \
  --sku B1 \
  --is-linux

# Create App Service
az webapp create \
  --resource-group chat-india-rg \
  --plan chat-india-plan \
  --name chatindia-backend \
  --runtime "node|18-lts"
```

### Step 2: Configure Environment Variables

In Azure Portal:
1. Go to your App Service → **Settings → Configuration**
2. Click "New application setting" and add:

| Name | Value |
|------|-------|
| `PORT` | `8080` |
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Generate a strong secret (32+ chars) |
| `FRONTEND_URL` | `https://chat-india.vercel.app` |
| `NODE_ENV` | `production` |
| `REDIS_URL` | (Optional) Redis connection or leave empty if not needed |

3. Click "Save"

### Step 3: Set Up Deployment

**Option A: Continuous Deployment from GitHub**

1. In App Service → **Deployment Center**
2. Select "GitHub" as source
3. Click "Authorize" and select your repository
4. Select branch: `dev`
5. Click "Save"
6. Azure will auto-deploy on every push to `dev`

**Option B: Manual Deployment with ZIP**

```bash
# Build locally
cd backend
npm run build

# Create deployment package
zip -r deployment.zip dist/ node_modules/ package.json

# Upload to Azure (requires Azure CLI)
az webapp deployment source config-zip \
  --resource-group chat-india-rg \
  --name chatindia-backend \
  --src deployment.zip
```

### Step 4: Enable HTTPS (Automatic)

Azure App Service automatically provides HTTPS with `*.azurewebsites.net` domain.

---

## 3. Database Setup

### Option A: MongoDB Atlas (Recommended)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Add database user with username/password
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/chat_india`
5. Set as `MONGODB_URI` environment variable in Azure

### Option B: Azure Cosmos DB

1. In Azure Portal, create "Azure Cosmos DB" resource
2. API: MongoDB
3. Get connection string from Keys section
4. Set as `MONGODB_URI` environment variable

---

## 4. Verify Deployment

### Check Frontend
```bash
curl https://chat-india.vercel.app
# Should return HTML
```

### Check Backend
```bash
curl https://chatindia-backend.azurewebsites.net
# Should return: {"status":"ok","app":"Chat-India API"}
```

### Test API Endpoint
```bash
curl https://chatindia-backend.azurewebsites.net/api/auth/sessions
# Should require authentication token
```

---

## 5. Configure CORS

Backend already has CORS configured with environment variable `FRONTEND_URL`:

```typescript
// In backend/src/index.ts
const allowedOrigins = [
  'https://chat-india.vercel.app',  // Production
  process.env.FRONTEND_URL
];
```

Make sure your `FRONTEND_URL` environment variable is set correctly in Azure.

---

## 6. SSL/HTTPS Configuration

- **Vercel**: ✅ Automatic (free Let's Encrypt)
- **Azure App Service**: ✅ Automatic (*.azurewebsites.net domain)
- **Custom Domain**: Follow Azure docs for adding custom domain with SSL

---

## 7. Monitoring & Logs

### Vercel Logs
- Dashboard → Your project → "Deployments" tab
- Click any deployment → "Functions" or "Runtime Logs"

### Azure Logs
1. App Service → **Logs** section
2. Click "Log stream" to see real-time logs
3. Or use Azure CLI:
```bash
az webapp log tail --resource-group chat-india-rg --name chatindia-backend
```

---

## 8. Troubleshooting

### Frontend Won't Connect to Backend
- ✅ Verify `BACKEND_URL` environment variable is set in Vercel
- ✅ Check CORS is enabled in Azure backend
- ✅ Verify Azure environment variable `FRONTEND_URL` matches Vercel domain

### 502 Bad Gateway from Azure
- Check logs: `az webapp log tail...`
- Verify all environment variables are set
- Ensure `npm run build` succeeds locally

### MongoDB Connection Failed
- Verify `MONGODB_URI` environment variable is set
- Check MongoDB Atlas IP whitelist includes Azure IP ranges
- For Cosmos DB, verify connection string format

---

## 9. Performance Tips

### Frontend (Vercel)
- ✅ Already optimized with Next.js
- Enable Image Optimization in next.config.ts
- Use Vercel Analytics to monitor performance

### Backend (Azure)
- Upgrade to B2 plan if hitting CPU limits
- Enable Application Insights for monitoring
- Use Azure Cache for Redis if using sessions

---

## 10. Cost Estimate

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby (free) | Free ($0) |
| Azure App Service | B1 Linux | ~$15 |
| MongoDB Atlas | M0 (free) | Free ($0) |
| **Total** | | **~$15/month** |

For production:
- Vercel Pro: $20/month
- Azure B2: ~$50/month
- MongoDB M2: ~$57/month
- **Total**: ~$127/month

---

## 11. Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Azure  
3. ✅ Set environment variables
4. ✅ Test endpoints with curl/Postman
5. ✅ Monitor logs for errors
6. ✅ Set up custom domains (optional)
7. ✅ Configure CI/CD for auto-deployment

---

**Questions?** Check Azure docs: https://docs.microsoft.com/azure/app-service
