import { Request, Response } from 'express';
import { storage } from '../storage';
import { firebaseService } from '../services/firebase.service';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  idToken: z.string(),
});

const registerSchema = z.object({
  idToken: z.string(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
});

export const authController = {
  /**
   * Login a user with Firebase ID token
   * If the user exists, returns user data
   * If the user doesn't exist, creates a new user
   */
  login: async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = loginSchema.parse(req.body);
      
      // Verify Firebase token
      const decodedToken = await firebaseService.verifyToken(validatedData.idToken);
      
      // Get user by Firebase UID
      let user = await storage.getUserByUid(decodedToken.uid);
      
      // If user doesn't exist, create a new user
      if (!user) {
        user = await storage.createUser({
          email: decodedToken.email || '',
          uid: decodedToken.uid,
          displayName: decodedToken.name || decodedToken.email?.split('@')[0] || '',
          photoURL: decodedToken.picture || '',
        });
      }
      
      // Get user with storage info
      const userWithStorage = await storage.getUserWithStorageInfo(user.id);
      
      return res.status(200).json(userWithStorage);
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Login failed', error: error.message });
    }
  },
  
  /**
   * Register a new user with Firebase ID token
   */
  register: async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = registerSchema.parse(req.body);
      
      // Verify Firebase token
      const decodedToken = await firebaseService.verifyToken(validatedData.idToken);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUid(decodedToken.uid);
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Create new user
      const user = await storage.createUser({
        email: decodedToken.email || '',
        uid: decodedToken.uid,
        displayName: validatedData.displayName || decodedToken.name || decodedToken.email?.split('@')[0] || '',
        photoURL: validatedData.photoURL || decodedToken.picture || '',
      });
      
      // Get user with storage info
      const userWithStorage = await storage.getUserWithStorageInfo(user.id);
      
      return res.status(201).json(userWithStorage);
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  },
  
  /**
   * Get the current authenticated user
   */
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      // User will be attached by the auth middleware
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user with storage info
      const userWithStorage = await storage.getUserWithStorageInfo(user.id);
      
      return res.status(200).json(userWithStorage);
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({ message: 'Failed to get user data', error: error.message });
    }
  },
};
