# Deployment Environment Variables

## Required for Production:

### Backend (Render/Railway/Vercel):
```
NODE_ENV=production
JWT_SECRET=generate-strong-32-char-secret-here
MONGODB_URI=your-mongodb-atlas-connection-string
PORT=5000
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

### Frontend (Vercel):
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.onrender.com
```

## Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## MongoDB Atlas:
1. Create cluster at mongodb.com
2. Get connection string
3. Replace <password> with your password

## Deployment Steps:
1. ✅ Code pushed to GitHub
2. Deploy backend to Render/Railway
3. Deploy frontend to Vercel
4. Set environment variables
5. Test deployment

## Performance Improvements Included:
- ✅ Pagination (20 items per page)
- ✅ Image optimization
- ✅ Response compression
- ✅ Simplified chat system
- ✅ Database indexes
- ✅ Memoized components
- ✅ Service worker caching