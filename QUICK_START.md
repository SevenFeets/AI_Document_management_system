# Quick Start Guide

## 🚀 Get Running in 30 Minutes

### Step 1: Prerequisites Check (5 min)

```bash
# Check Node.js version (should be 18+)
node --version

# Check Docker is running
docker --version
docker ps

# Check Git
git --version
```

### Step 2: Install Dependencies (10 min)

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### Step 3: Start Infrastructure Services (5 min)

```bash
# From project root
docker-compose up -d postgres redis elasticsearch

# Wait 30 seconds for services to start, then verify:
docker ps

# Test Elasticsearch
curl http://localhost:9200
```

### Step 4: Configure Environment (5 min)

**Create `backend/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=document_search
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://localhost:9200
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# For now, you can skip AWS and OpenAI to test basic functionality
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=test-bucket
OPENAI_API_KEY=test-key
```

**Create `frontend/.env`:**
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Step 5: Start Backend (5 min)

```bash
cd backend
npm run start:dev
```

**Expected output:**
```
Application is running on: http://localhost:4000
```

**If you see database errors:**
- Wait a bit longer for PostgreSQL to start
- Check `docker ps` to ensure postgres is running
- Try restarting: `docker-compose restart postgres`

### Step 6: Start Frontend (5 min)

**In a new terminal:**
```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

### Step 7: Test Basic Functionality

1. **Open browser:** http://localhost:3000
2. **You should see:** Dashboard page
3. **Try uploading a document:**
   - Go to Upload page
   - Drag & drop a PDF or text file
   - Check console for errors

### Step 8: Verify Backend API

**Test in browser or with curl:**
```bash
# Get all documents
curl http://localhost:4000/api/documents

# Should return: []
```

---

## 🐛 Troubleshooting

### Problem: Backend won't start

**Check:**
1. Are PostgreSQL, Redis, Elasticsearch running? (`docker ps`)
2. Check backend logs for errors
3. Verify `.env` file exists and has correct values
4. Try: `docker-compose restart postgres redis elasticsearch`

### Problem: Frontend won't start

**Check:**
1. Is backend running? (http://localhost:4000)
2. Check frontend `.env` file
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Problem: Database connection error

**Solution:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds, then try backend again
```

### Problem: Elasticsearch connection error

**Solution:**
```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# If not responding, restart
docker-compose restart elasticsearch

# Wait 30-60 seconds for it to fully start
```

---

## ✅ Success Checklist

- [ ] All Docker services running (`docker ps` shows 3+ containers)
- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can access http://localhost:3000
- [ ] Can access http://localhost:4000/api/documents
- [ ] No console errors in browser
- [ ] No errors in backend terminal

---

## 🎯 Next Steps After Quick Start

Once basic setup works:

1. **Test document upload** (even if S3 isn't configured, it should save metadata)
2. **Implement document parsing** (Phase 2.1 in IMPLEMENTATION_PLAN.md)
3. **Test search functionality**
4. **Add OpenAI API key** for AI features
5. **Configure AWS S3** for real file storage

---

## 📝 Notes

- **For local development**, you can mock S3 storage initially
- **OpenAI API** is optional for basic functionality
- **Focus on getting the core flow working first**: Upload → Process → Search
- **Add AI features later** once basics work

---

## 🆘 Still Stuck?

1. Check the full IMPLEMENTATION_PLAN.md
2. Review ARCHITECTURE.md for system overview
3. Check backend/frontend README files
4. Look at error messages carefully - they usually tell you what's wrong

Good luck! 🚀
