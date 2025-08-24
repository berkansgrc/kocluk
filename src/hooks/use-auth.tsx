
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
import type { AppUser } from '@/lib/types';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isParent: boolean;
  studentIdForParent: string | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const protectedRoutes = ['/', '/reports', '/resources', '/achievements'];
export const adminRoutes = ['/admin', '/admin/student', '/admin/library'];
export const parentRoutes = ['/parent/dashboard'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [studentIdForParent, setStudentIdForParent] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Check user role from 'users' collection
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const appUser = userDocSnap.data() as AppUser;
          const userRole = appUser.role;

          setIsAdmin(userRole === 'admin');
          setIsParent(userRole === 'parent');

          if (userRole === 'parent') {
            setStudentIdForParent(appUser.studentId || null);
          } else {
            setStudentIdForParent(null);
          }
        } else {
           // This is a fallback for the admin user who might not be in the 'users' collection.
           const isAdminByEmail = firebaseUser.email === 'berkan_1225@hotmail.com';
           if (isAdminByEmail) {
              setIsAdmin(true);
              setIsParent(false);
           } else {
              console.warn(`No user document found in Firestore for UID: ${firebaseUser.uid}`);
              setIsAdmin(false);
              setIsParent(false);
           }
           setStudentIdForParent(null);
        }

      } else {
        setUser(null);
        setIsAdmin(false);
        setIsParent(false);
        setStudentIdForParent(null);
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
    <AuthContext.Provider value={{ user, loading, isAdmin, isParent, studentIdForParent, login, logout }}>
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
