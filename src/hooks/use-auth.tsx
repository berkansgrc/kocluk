

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
  isTeacher: boolean;
  assignedClasses: string[] | null;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const protectedRoutes = ['/', '/plan', '/reports', '/resources', '/achievements', '/zaman-yonetimi', '/deneme-analizi', '/hata-raporu'];
export const adminAndTeacherRoutes = ['/admin', '/admin/student', '/admin/library', '/admin/reports', '/admin/students'];


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState<string[] | null>(null);

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const appUser = userDocSnap.data() as AppUser;
          setIsAdmin(appUser.role === 'admin');
          setIsTeacher(appUser.role === 'teacher');
          setAssignedClasses(appUser.assignedClasses || null);
        } else {
           // Fallback for the original admin user who might not have a doc in 'users'
           const isAdminByEmail = firebaseUser.email === 'berkan_1225@hotmail.com';
           if (isAdminByEmail) {
              setIsAdmin(true);
           } else {
              console.warn(`No user document found in Firestore for UID: ${firebaseUser.uid}`);
              setIsAdmin(false);
           }
           setIsTeacher(false);
           setAssignedClasses(null);
        }

      } else {
        setUser(null);
        setIsAdmin(false);
        setIsTeacher(false);
        setAssignedClasses(null);
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
    <AuthContext.Provider value={{ user, loading, isAdmin, isTeacher, assignedClasses, login, logout }}>
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
