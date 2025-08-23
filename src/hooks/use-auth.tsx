'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode,
  useCallback, 
} from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { app, auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import type { Student } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  studentData: Student | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  refreshStudentData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const protectedRoutes = ['/', '/reports', '/resources'];
const adminRoute = '/admin';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchStudentData = useCallback(async (firebaseUser: User) => {
    if (!firebaseUser) {
      setStudentData(null);
      return;
    };
    const q = query(collection(db, "students"), where("email", "==", firebaseUser.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const studentDoc = querySnapshot.docs[0];
      const data = studentDoc.data() as Omit<Student, 'id'>;
      setStudentData({ id: studentDoc.id, ...data });
    } else {
       // This could happen if a user is in Auth but not in 'students' collection
       console.warn("No student data found for this user in Firestore.");
       setStudentData(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchStudentData(firebaseUser);
      } else {
        setUser(null);
        setStudentData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchStudentData]);

  useEffect(() => {
    if (loading) return;

    const isProtectedRoute = protectedRoutes.includes(pathname);
    const isAdminRoute = pathname === adminRoute;

    if (!user && (isProtectedRoute || isAdminRoute)) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, loading, pathname, router]);


  const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signup = async (email: string, pass: string) => {
    // Check if the user is in the students collection before allowing signup
    const q = query(collection(db, "students"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error("Bu e-posta adresiyle kayıt olmaya izniniz yok.");
    }
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    setStudentData(null);
    await signOut(auth);
    router.push('/login');
  };
  
  const refreshStudentData = useCallback(() => {
    if(user) {
      fetchStudentData(user);
    }
  }, [user, fetchStudentData]);


  return (
    <AuthContext.Provider value={{ user, studentData, loading, login, signup, logout, refreshStudentData }}>
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
