

'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode,
} from 'react';
import { 
  User, 
  signOut,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const protectedRoutes = ['/', '/plan', '/reports', '/resources', '/achievements', '/zaman-yonetimi', '/deneme-analizi'];
export const adminRoutes = ['/admin', '/admin/student', '/admin/library', '/admin/reports', '/admin/students'];


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setIsAdmin(userData.role === 'admin');
            setIsTeacher(userData.role === 'teacher');
        } else {
            // Fallback for the original admin email, just in case
            const isAdminByEmail = firebaseUser.email === 'berkan_1225@hotmail.com';
            setIsAdmin(isAdminByEmail);
            setIsTeacher(false);
        }

      } else {
        setUser(null);
        setIsAdmin(false);
        setIsTeacher(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isTeacher, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
