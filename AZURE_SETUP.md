# Azure Deployment - Completed Steps

## ✅ Completed

- ✅ Resource Group: `chat-india`
- ✅ App Service Plan: `chat-india-plan` (B1 tier, Linux)
- ✅ Web App: `chatindia-backend` (Node.js 20 LTS)
- ✅ Basic Environment Variables configured

## 🔑 Your Backend URL
```
https://chatindia-backend.azurewebsites.net
```

## 📋 Security Credentials (Save These!)

Add the following to your Azure environment variables:

### JWT_SECRET (Generated)
```
fPca2u06zDEiDTHBEz7N3oLNVltAho5bVkahSCdFOCE=
```

### MONGODB_URI (You need to create MongoDB Atlas account)

---

## 🗄️ Step 1: Set Up MongoDB Atlas

### 1.1 Create Free MongoDB Cluster

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up with GitHub (free account)
3. Create a new project: `Chat-India`
4. Click "Build a Database"
5. Select: **M0 (Free)** tier
6. Select region: **US East (Ohio)** (or closest to Azure East US)
7. Click "Create" (takes 1-2 minutes)

### 1.2 Add Database User

1. While cluster is creating, go to **Security → Database Access**
2. Click "Add New Database User"
3. Username: `chat_india_user`
4. Password: Generate strong password or use this:
   ```
   ChatIndia@2024SecurePass123
   ```
5. Permissions: **Read and write to any database**
6. Click "Add User"

### 1.3 Set Up IP Whitelist

1. Go to **Security → Network Access**
2. Click "Add IP Address"
3. Select: **"Allow access from anywhere"** (for development)
   - IP: `0.0.0.0/0`
4. Confirm

> **Security Note:** For production, add only Azure IPs. See Azure docs for App Service IP ranges.

### 1.4 Get Connection String

1. Go to your cluster page
2. Click "Connect"
3. Select "Drivers"
4. Choose "Node.js" and version "5.9 and later"
5. Copy the connection string, it looks like:
   ```
   mongodb+srv://chat_india_user:PASSWORD@cluster0.xxxxx.mongodb.net/chat_india?retryWrites=true&w=majority
   ```
6. **Replace `PASSWORD` with your password from Step 1.2**

---

## 🔐 Step 2: Update Azure Environment Variables

Run this command with YOUR MongoDB connection string:

```bash
az webapp config appsettings set \
  --resource-group chat-india \
  --name chatindia-backend \
  --settings \
    MONGODB_URI="mongodb+srv://chat_india_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/chat_india?retryWrites=true&w=majority" \
    JWT_SECRET="fPca2u06zDEiDTHBEz7N3oLNVltAho5bVkahSCdFOCE="
```

### Verify Settings

```bash
az webapp config appsettings list \
  --resource-group chat-india \
  --name chatindia-backend
```

---

## 📦 Step 3: Build & Deploy Backend

### 3.1 Build Your Backend

```bash
cd /workspaces/Chat_India/backend
npm run build
```

### 3.2 Create Deployment Package

```bash
# Create ZIP with all necessary files
zip -r deployment.zip dist/ node_modules/ package.json
```

### 3.3 Deploy to Azure

```bash
az webapp deployment source config-zip \
  --resource-group chat-india \
  --name chatindia-backend \
  --src deployment.zip
```

Check deployment status:
```bash
az webapp deployment list --resource-group chat-india --name chatindia-backend
```

---

## 🧪 Step 4: Verify Backend is Running

### Test 1: Check Status
```bash
curl -s https://chatindia-backend.azurewebsites.net | jq .
# Expected: {"status":"ok","app":"Chat-India API"}
```

### Test 2: Check Logs (if there are errors)
```bash
az webapp log tail --resource-group chat-india --name chatindia-backend
```

---

## 🌐 Step 5: Deploy Frontend to Vercel

### 5.1 Connect to Vercel

1. Go to https://vercel.com/new
2. Select "Import Project"
3. Choose your GitHub repository: `Chat_India`
4. Click "Import"

### 5.2 Configure Environment Variables

In Vercel Dashboard → **Settings → Environment Variables**, add:

```
BACKEND_URL=https://chatindia-backend.azurewebsites.net
NEXT_PUBLIC_API_URL=https://chatindia-backend.azurewebsites.net/api
```

### 5.3 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Your frontend URL will be: `https://chat-india.vercel.app`

---

## 📊 Summary

| Component | URL/Value |
|-----------|----------|
| Frontend | https://chat-india.vercel.app |
| Backend | https://chatindia-backend.azurewebsites.net |
| Database | MongoDB Atlas (M0 free) |
| API Health | https://chatindia-backend.azurewebsites.net |

---

## 💰 Monthly Costs

- **Vercel**: Free (Hobby plan)
- **Azure App Service B1**: ~$15/month
- **MongoDB Atlas M0**: Free
- **Total**: ~$15/month

---

## 🔗 Quick Links

- Azure Portal: https://portal.azure.com
- Vercel Dashboard: https://vercel.com
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Azure CLI Docs: https://docs.microsoft.com/cli/azure/

---

## ⚠️ Important Notes

1. **Save your JWT_SECRET** - You'll need it for production backups
2. **MongoDB IP Whitelist** - For production, restrict to Azure IPs only
3. **HTTPS** - Both Azure and Vercel provide automatic HTTPS
4. **Database Backup** - Enable MongoDB backup in Atlas settings
5. **Monitoring** - Enable Application Insights in Azure portal

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check logs: `az webapp log tail...` |
| Can't connect to DB | Verify MONGODB_URI and IP whitelist |
| Deployment failed | Check ZIP includes `dist/` and `node_modules/` |
| Socket.IO errors | Update BACKEND_URL in Vercel env vars |

---

**Next Steps:**
1. ✅ Set up MongoDB Atlas
2. ✅ Update Azure environment variables
3. ✅ Build and deploy backend
4. ✅ Deploy frontend to Vercel
5. ✅ Test the full application

Questions? Check the logs with: `az webapp log tail -g chat-india -n chatindia-backend`
