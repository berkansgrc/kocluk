
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
import { collection, query, where, getDocs } from 'firebase/firestore';


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

export const protectedRoutes = ['/', '/reports', '/resources', '/achievements', '/parent/dashboard'];
export const adminRoutes = ['/admin', '/admin/student', '/admin/library'];
export const parentRoutes = ['/parent/dashboard'];

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

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
        const isAdminUser = firebaseUser.email === ADMIN_EMAIL;
        setIsAdmin(isAdminUser);

        if (!isAdminUser) {
          const studentsRef = collection(db, "students");
          const q = query(studentsRef, where("parentEmail", "==", firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            setIsParent(true);
            // Assuming one parent is linked to one student
            setStudentIdForParent(querySnapshot.docs[0].id);
          } else {
            setIsParent(false);
            setStudentIdForParent(null);
          }
        } else {
          setIsParent(false);
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
