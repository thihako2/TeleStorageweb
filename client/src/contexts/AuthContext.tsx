import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  auth, 
  getCurrentUser, 
  loginWithEmailPassword, 
  registerWithEmailPassword, 
  loginWithGoogle, 
  logoutUser, 
  type FirebaseUser 
} from "@/lib/firebase";
import { loginUser, registerUser, getCurrentUser as fetchUserData } from "@/lib/api";
import { type User, type UserWithStorage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextProps {
  user: UserWithStorage | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserWithStorage | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          // If we have no user data yet, try to login which will create or fetch the user
          if (!user) {
            await loginUser(token);
          }
          
          // Fetch the user data from our API
          const userData = await fetchUserData();
          setUser(userData);
        } catch (error) {
          console.error("Error getting user data:", error);
          toast({
            title: "Authentication Error",
            description: "Failed to load user data. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await loginWithEmailPassword(email, password);
      const token = await userCredential.user.getIdToken();
      await loginUser(token);
      const userData = await fetchUserData();
      setUser(userData);
      toast({
        title: "Login Successful",
        description: "Welcome back to TeleStore!",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Check your credentials and try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await registerWithEmailPassword(email, password);
      const token = await userCredential.user.getIdToken();
      const displayName = userCredential.user.displayName || email.split('@')[0];
      await registerUser(token, { displayName, photoURL: userCredential.user.photoURL || undefined });
      const userData = await fetchUserData();
      setUser(userData);
      toast({
        title: "Registration Successful",
        description: "Welcome to TeleStore!",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      setLoading(true);
      const userCredential = await loginWithGoogle();
      const token = await userCredential.user.getIdToken();
      await loginUser(token);
      const userData = await fetchUserData();
      setUser(userData);
      toast({
        title: "Login Successful",
        description: "Welcome to TeleStore!",
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during Google login.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await logoutUser();
      setUser(null);
      toast({
        title: "Logout Successful",
        description: "You have been logged out of TeleStore.",
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      if (firebaseUser) {
        const userData = await fetchUserData();
        setUser(userData);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      login,
      register,
      googleLogin,
      logout,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
