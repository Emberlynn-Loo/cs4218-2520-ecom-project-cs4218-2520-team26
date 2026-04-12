import cluster from "cluster";
import os from "os";
import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cors from "cors";

// configure env
dotenv.config();

const NUM_WORKERS = Number(process.env.CLUSTER_WORKERS) || os.cpus().length;
const TCP_BACKLOG = Number(process.env.TCP_BACKLOG) || 2048;
const PORT = process.env.PORT || 6060;

if (cluster.isPrimary) {
  console.log(
    `Primary ${process.pid} starting ${NUM_WORKERS} workers`.bgMagenta.white,
  );

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.warn(
      `Worker ${worker.process.pid} exited (${signal || code}). Restarting...`
        .bgYellow.white,
    );
    cluster.fork();
  });
} else {
  const app = express();
  const loginRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.LOGIN_RATE_LIMIT) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many login attempts. Please try again in a minute.",
    },
  });

  //middlewares
  app.use(cors());
  app.use(express.json());
  app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.path.startsWith("/api/v1/product/product-photo/")) return false;
      return compression.filter(req, res);
    },
  }));
  if (process.env.ENABLE_HTTP_LOGS === "true") {
    app.use(morgan("dev"));
  }
  
  app.post("/api/v1/auth/login", loginRateLimit);

  //routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/category", categoryRoutes);
  app.use("/api/v1/product", productRoutes);

  app.get("/", (_req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
  });

  const startServer = async () => {
    try {
      await connectDB();
      app.listen(PORT, undefined, TCP_BACKLOG, () => {
        console.log(
          `Worker ${process.pid} running on ${process.env.DEV_MODE} mode on port ${PORT}`
            .bgCyan.white,
        );
      });
    } catch (error) {
      console.error(`Worker ${process.pid} failed to start: ${error.message}`.bgRed.white);
      process.exit(1);
    }
  };

  startServer();
}
