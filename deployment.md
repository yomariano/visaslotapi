# API Deployment Guide

## CORS Configuration

To fix CORS issues in production, ensure that your environment variables are properly set:

1. Make sure your `.env` production file includes the following:

```
# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,https://visaslot.xyz,https://www.visaslot.xyz
```

2. If you're using a Docker deployment, ensure these environment variables are passed to the container:

```yaml
environment:
  - ALLOWED_ORIGINS=http://localhost:5173,https://visaslot.xyz,https://www.visaslot.xyz
```

3. If you're deploying on a platform service (like Heroku, Vercel, etc.), add these environment variables in your project settings.

## Deployment Checklist

- [ ] Set `ALLOWED_ORIGINS` with all frontend domains that will access the API
- [ ] Verify Node.js environment is set to `production`
- [ ] Ensure all Stripe API keys are configured for production
- [ ] Set proper MongoDB connection string for production database
- [ ] Enable logging for debugging CORS issues

## Troubleshooting CORS Issues

If you're still experiencing CORS issues:

1. Check browser console for the exact error message
2. Verify the exact origin of the request being blocked 
3. Make sure `credentials: true` is properly set if you're sending cookies
4. Examine API logs to see if the origin is being rejected by the CORS policy
5. Try using a wildcard temporarily (`ALLOWED_ORIGINS=*`) to isolate the issue 