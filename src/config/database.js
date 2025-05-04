const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connect = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(uri);
    
    logger.info(`MongoDB connected successfully to ${process.env.MONGODB_DB_NAME || 'visaslot'} database`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const disconnect = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error(`Error disconnecting from MongoDB: ${error.message}`);
  }
};

module.exports = {
  connect,
  disconnect
}; 