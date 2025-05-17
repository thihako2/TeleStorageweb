import type { Express, Request, Response } from "express";

// Extend the Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authController } from "./controllers/auth.controller";
import { filesController } from "./controllers/files.controller";
import multer from "multer";
import { z } from "zod";
import { telegramService } from "./services/telegram.service";
import { firebaseService } from "./services/firebase.service";
import fs from 'fs';

// Initialize Firebase Admin and Telegram services
const initializeServices = async () => {
  try {
    await firebaseService.initialize();
    await telegramService.initialize();
    console.log("Services initialized successfully");
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.error("Failed to initialize services:", error);
    
    if (isDevelopment) {
      console.warn("Running in development mode. Continuing despite service initialization errors.");
      // In development, we continue even if there are service initialization errors
    } else {
      process.exit(1);
    }
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  await initializeServices();

  // Setup multer for file uploads
  // Change from memory storage to disk storage
  const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Create a temp directory if it doesn't exist
      const tmpDir = './temp_uploads';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      cb(null, tmpDir);
    },
    filename: function (req, file, cb) {
      // Generate a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  const upload = multer({
    storage: diskStorage,
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
    },
  });

  // Authentication middleware
  const authMiddleware = async (req: Request, res: Response, next: Function) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
      }

      const token = authHeader.split(" ")[1];
      console.log("authMiddleware token:", token);
      console.log("authMiddleware token passed to verifyToken:", token);
      const decodedToken = await firebaseService.verifyToken(token);
      const user = await storage.getUserByUid(decodedToken.uid);
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized: User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  };

  // API routes
  // Auth routes
  app.post("/api/auth/login", authController.login);
  app.post("/api/auth/register", authController.register);
  app.get("/api/auth/me", authMiddleware, authController.getCurrentUser);

  // File routes
  app.get("/api/files", authMiddleware, filesController.getUserFiles);
  app.get("/api/files/recent", authMiddleware, filesController.getRecentFiles);
  app.get("/api/files/type/:type", authMiddleware, filesController.getFilesByType);
  app.get("/api/files/:id", authMiddleware, filesController.getFile);
  app.post("/api/files/save-temp", authMiddleware, upload.single("file"), filesController.saveTempFile); // New route for temporary saving
  app.post("/api/files/upload", authMiddleware, upload.single("file"), filesController.uploadFile); // Keep upload.single for direct uploads or if tempPath is not used
  app.get("/api/files/:id/download", authMiddleware, filesController.downloadFile);
  app.delete("/api/files/:id", authMiddleware, filesController.deleteFile);
  app.patch("/api/files/:id/star", authMiddleware, filesController.starFile);

  // Shared file routes
  app.post("/api/files/:id/share", authMiddleware, filesController.shareFile);
  app.delete("/api/shared/:id", authMiddleware, filesController.deleteSharedLink);
  app.get("/api/shared/:shareLink", filesController.getSharedFile);

  // Setup HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
