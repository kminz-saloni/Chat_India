# Quick Start: Deploy to Vercel & Azure

## Prerequisites

- GitHub account with repository access
- Vercel account: https://vercel.com
- Azure account: https://azure.microsoft.com

---

## Step 1: Deploy Frontend to Vercel (5 minutes)

### 1.1 Connect GitHub Repository

1. Go to **https://vercel.com/new**
2. Click "Select Git Repository"
3. Select your `Chat_India` repository
4. Click "Import"

### 1.2 Configure Environment

In the "Environment Variables" section, add:

```
BACKEND_URL=https://chatindia-backend.azurewebsites.net
NEXT_PUBLIC_API_URL=https://chatindia-backend.azurewebsites.net/api
```

> **Note**: Update with your actual Azure backend URL after deployment

### 1.3 Deploy

1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. ✅ Frontend is now live at: `https://your-project.vercel.app`

---

## Step 2: Deploy Backend to Azure (15 minutes)

### 2.1 Create Azure App Service

Using Azure CLI (fastest):

```bash
# Install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name chat-india --location eastus

# Create App Service Plan
az appservice plan create \
  --name chat-india-plan \
  --resource-group chat-india \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group chat-india \
  --plan chat-india-plan \
  --name chatindia-backend \
  --runtime "node|18-lts"
```

### 2.2 Configure Environment Variables

```bash
az webapp config appsettings set \
  --resource-group chat-india \
  --name chatindia-backend \
  --settings \
    PORT=8080 \
    NODE_ENV=production \
    MONGODB_URI="mongodb+srv://karanminj9717_db_user:Cl2rEwS6BpEYVh5s@cluster0.rgwtqae.mongodb.net/?appName=Cluster0" \
    JWT_SECRET="573f27t27632g83eg238rg87yg3484623ygf687f2g892h83h87ug23h8327gf78u238" \
    FRONTEND_URL="https://chat-india-two.vercel.app/"
```

### 2.3 Deploy Code

**Option A: Automatic (Recommended)**

1. Go to [Azure Portal](https://portal.azure.com)
2. Find your App Service `chatindia-backend`
3. Go to **Deployment Center**
4. Select "GitHub" as source
5. Authorize and select your repository
6. Select branch: `dev`
7. Click "Save"
8. Azure will auto-deploy on every push

**Option B: Manual Upload

```bash
cd backend
npm run build
zip -r deployment.zip dist/ node_modules/ package.json

az webapp deployment source config-zip \
  --resource-group chat-india \
  --name chatindia-backend \
  --src deployment.zip
```

### 2.4 Verify Deployment

```bash
curl https://chatindia-backend.azurewebsites.net
# Expected response: {"status":"ok","app":"Chat-India API"}
```

---

## Step 3: Update Vercel with Azure URL

Now that your backend is deployed:

1. Go to your Vercel project dashboard
2. Go to **Settings → Environment Variables**
3. Update `BACKEND_URL` with your Azure URL: `https://chatindia-backend.azurewebsites.net`
4. Redeploy: Go to **Deployments** → Click latest → **Redeploy**

---

## Step 4: Test Everything

### Test Frontend
```bash
curl https://your-project.vercel.app
# Should return Next.js HTML
```

### Test Backend
```bash
curl https://chatindia-backend.azurewebsites.net/api/auth/sessions
# Should require authentication (expected 401 or similar)
```

### Test Full Integration
1. Open your Vercel app in browser
2. Try logging in
3. Create a chat
4. Send a message
5. ✅ Everything should work!

---

## Step 5: Set Up Database

### Option A: MongoDB Atlas (Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster (M0)
3. Add database user
4. Get connection string
5. Add to Azure: `az webapp config appsettings set --resource-group chat-india --name chatindia-backend --settings MONGODB_URI="your-connection-string"`

### Option B: Azure Cosmos DB

1. In Azure Portal, create "Cosmos DB" resource
2. API: MongoDB
3. Copy connection string from Keys
4. Add to environment variables

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend shows 502 error | Check Azure logs: `az webapp log tail -g chat-india -n chatindia-backend` |
| Cannot connect to database | Verify MONGODB_URI environment variable in Azure |
| CORS errors | Verify FRONTEND_URL is set in Azure and matches Vercel domain |
| Socket.IO not connecting | Backend/frontend URL mismatch - update BACKEND_URL in Vercel |

---

## Monitoring

### Vercel Logs
Dashboard → Deployments → Click deployment → Runtime Logs

### Azure Logs
```bash
az webapp log tail --resource-group chat-india --name chatindia-backend
```

---

## Cost

- **Vercel**: Free (Hobby plan)
- **Azure App Service**: ~$15/month (B1 tier)
- **MongoDB Atlas**: Free (M0 tier)
- **Total**: ~$15/month

---

## Next Steps

- ✅ Set up custom domain (optional)
- ✅ Enable Application Insights on Azure
- ✅ Configure auto-scaling if needed
- ✅ Set up monitoring alerts

📚 **Full docs**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
