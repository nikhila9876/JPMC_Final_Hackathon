import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * Uses MONGODB_URI or MONGO_URI from environment variables.
 */
export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('MongoDB connection failed: Neither MONGODB_URI nor MONGO_URI is defined.');
      return null;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
    return conn;
  } catch (error) {
    console.error('MongoDB connection failed');
    // Note: Do not exit process in tests or server startup to allow graceful recovery/logging
    throw error;
  }
};

export default connectDB;
