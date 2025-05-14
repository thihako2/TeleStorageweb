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
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase credentials not found in environment variables. Using mock implementation.');
        this.initialized = true;
        return;
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
        // Mock implementation for development/testing
        console.warn('Using mock token verification');
        
        // Parse the JWT to extract the payload
        const payloadBase64 = idToken.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
        
        return {
          uid: payload.sub || 'mock-uid',
          email: payload.email || 'user@example.com',
          name: payload.name,
          picture: payload.picture,
          iat: payload.iat || Math.floor(Date.now() / 1000),
          exp: payload.exp || Math.floor(Date.now() / 1000) + 3600,
          auth_time: payload.auth_time || Math.floor(Date.now() / 1000),
          firebase: { sign_in_provider: 'custom' },
        } as admin.auth.DecodedIdToken;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new Error(`Invalid or expired token: ${error.message}`);
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
          photoURL: null,
          phoneNumber: null,
          disabled: false,
          metadata: {
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
            lastRefreshTime: null,
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
