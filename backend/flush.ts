import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function flushDatabase() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    
    console.log('Dropping database...');
    // This removes all collections and data in the current database
    if (mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
        console.log('Database successfully flushed!');
    } else {
        console.log('mongoose.connection.db is undefined');
    }

    // Creating indexes based on models
    console.log('Re-creating indexes (schemas are handled automatically by Mongoose)...');
    
    // Import all models to make sure Mongoose knows about them
    require('./src/models/User');
    require('./src/models/Chat');
    require('./src/models/Message');

    // Force index creation for all models
    for (const modelName of Object.keys(mongoose.models)) {
      await mongoose.models[modelName].createIndexes();
      console.log(`Indexes created for ${modelName}`);
    }

    console.log('Database reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error flushing database:', error);
    process.exit(1);
  }
}

flushDatabase();
