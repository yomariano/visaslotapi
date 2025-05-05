# Deployment Guide for VisaSlot API

## CORS Configuration Fix

The CORS issue affecting API communication between the frontend and backend requires the following changes:

1. Make sure your `.env` file in the API directory has this configuration:
```
ALLOWED_ORIGINS=https://visaslot.xyz
PORT=8000
```

2. Restart the API server to apply the CORS changes:
```bash
cd /path/to/api
npm run dev # for development
# OR
npm start # for production
```

3. Test the CORS configuration:
   - Visit: `https://api.visaslot.xyz/api/cors-test`
   - You should see a JSON response with CORS headers status

## Common Issues

### CORS Errors
If you're still seeing CORS errors in the browser console:

1. Ensure you've correctly set ALLOWED_ORIGINS in your .env file
2. Check that the exact frontend origin matches what's in ALLOWED_ORIGINS (no trailing slashes)
3. Make sure the NODE_ENV matches your deployment environment (development vs production)
4. Verify your reverse proxy or hosting service isn't stripping CORS headers

### API Connectivity
1. Ensure your frontend is correctly using the API_BASE_URL environment variable
2. Check network connection between the servers
3. Verify firewall rules allow connections on the API port

## Server Update Procedure

When updating the server configuration:

1. Make required code changes
2. Test locally if possible
3. Deploy changes to the server
4. Restart the API service using your process manager (PM2, systemd, etc.)
5. Monitor logs for any errors
6. Verify CORS with the diagnostic endpoint

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