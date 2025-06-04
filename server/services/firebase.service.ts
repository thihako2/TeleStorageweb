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
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase credentials not found in environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
      }

      // Handle different private key formats
      let formattedPrivateKey = privateKey;
      
      // If the private key doesn't include the BEGIN/END markers, assume it needs proper formatting
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      // Replace literal '\n' strings with actual newlines
      formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

      // Initialize Firebase Admin SDK with properly formatted private key
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
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
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized.');
      }

      // Use Firebase Admin SDK to verify token
      return await admin.auth().verifyIdToken(idToken);
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
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized.');
      }

      // Use Firebase Admin SDK to get user
      return await admin.auth().getUser(uid);
    } catch (error) {
      console.error('Failed to get user:', error);
      throw error;
    }
  }

  async setDatabaseData(path: string, data: any): Promise<void> {
    // Ensure Firebase is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!this.app) {
        throw new Error('Firebase Admin SDK not initialized.');
      }

      // Use Firebase Admin SDK to set data in the database
      const db = admin.database();
      await db.ref(path).set(data);
      console.log(`Data set at ${path}`);
    } catch (error) {
      console.error(`Failed to set data at ${path}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();