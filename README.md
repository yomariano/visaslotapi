# VisaSlot API Service

This is the API service for VisaSlot, handling user management and other API endpoints using Express.js and Node.js.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create an environment file:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Run the API server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The API server will start on port 8000 by default.

## Project Structure

```
api/
├── src/                  # Source directory
│   ├── config/           # Configuration files
│   │   └── database.js   # Database connection configuration
│   ├── models/           # Database models
│   │   └── User.js       # User model
│   ├── routes/           # API routes
│   │   └── users.js      # User-related endpoints
│   ├── utils/            # Utility functions
│   │   └── logger.js     # Logging utility
│   └── index.js          # Express application entry point
├── logs/                 # API logs directory
├── .env                  # Environment variables
├── .env.example          # Example environment variables
├── package.json          # Node.js dependencies
└── README.md             # This file
```

## API Endpoints

### Users

- `POST /api/users` - Create or update a user
  - Request body:
    ```json
    {
      "email": "string",
      "phone": "string",
      "countryFrom": "string",
      "cityFrom": "string",
      "countryTo": "string",
      "cityTo": "string",
      "subscriptionType": "string",
      "paymentDate": "string (ISO date, optional)"
    }
    ```
  - Response:
    ```json
    {
      "message": "string",
      "id": "string (for new users)",
      "email": "string (for existing users)"
    }
    ```

## Environment Variables

- `PORT` - Port for the API server (default: 8000)
- `NODE_ENV` - Environment mode (development/production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `MONGODB_URI` - MongoDB connection URI
- `MONGODB_DB_NAME` - MongoDB database name
- `MONGODB_COLLECTION_USERS` - MongoDB collection for users 