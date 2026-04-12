import mongoose from "mongoose";
import colors from "colors";

const MAX_POOL_CEIL = 50;

const connectDB = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not set");
  }

  const maxPoolSize = Math.min(
    Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    MAX_POOL_CEIL,
  );
  const minPoolSize = Math.min(
    Number(process.env.MONGO_MIN_POOL_SIZE || 5),
    Math.floor(maxPoolSize / 2),
  );

  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      maxPoolSize,
      minPoolSize,
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000,
      ),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      waitQueueTimeoutMS: Number(
        process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS || 5000,
      ),
      maxIdleTimeMS: 60000,
    });
    console.log(
      `Connected To Mongodb Database ${conn.connection.host} (pool: ${minPoolSize}–${maxPoolSize})`.bgMagenta.white,
    );
    return conn;
  } catch (error) {
    console.log(`Error in Mongodb ${error}`.bgRed.white);
    throw error;
  }
};

export default connectDB;
