import admin from 'firebase-admin';

/**
 * Firebase service for handling authentication and database operations
 */
class FirebaseService {
  private app: admin.app.App | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the Firebase Admin SDK
   */
  async initialize(): Promise<void> {
    try {
      // If already initialized, return
      if (this.initialized) {
        return;
      }
      
      // Check if required environment variables are set
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase credentials not found in environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
      }
      
      // Initialize Firebase Admin SDK
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      
      console.log('Firebase Admin SDK initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  /**
   * Verify a Firebase ID token
   * @param idToken Firebase ID token
   * @returns Decoded token
   */
  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    // Ensure Firebase is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      if (this.app) {
        // Use Firebase Admin SDK to verify token
        return await admin.auth().verifyIdToken(idToken);
      } else {
        throw new Error('Firebase Admin SDK not initialized.');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Get a user by UID
   * @param uid Firebase user UID
   * @returns Firebase user record
   */
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    // Ensure Firebase is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      if (this.app) {
        // Use Firebase Admin SDK to get user
        return await admin.auth().getUser(uid);
      } else {
        // Mock implementation for development/testing
        console.warn('Using mock user record');
        
        return {
          uid,
          email: 'user@example.com',
          emailVerified: true,
          displayName: 'Test User',
          photoURL: undefined,
          phoneNumber: undefined,
          disabled: false,
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
            lastRefreshTime: undefined,
            toJSON: () => ({
              creationTime: new Date().toISOString(),
              lastSignInTime: new Date().toISOString(),
            }),
          },
          providerData: [],
          toJSON: () => ({ uid }),
        } as admin.auth.UserRecord;
      }
    } catch (error) {
      console.error('Failed to get user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
