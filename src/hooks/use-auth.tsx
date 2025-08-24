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
  User, 
  signOut,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { 
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import type { Student } from '@/lib/types';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  studentData: Student | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  refreshStudentData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const protectedRoutes = ['/', '/reports', '/resources'];
const adminRoutes = ['/admin', '/admin/student'];

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchStudentData = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setStudentData(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Set user first to avoid race conditions
    setUser(firebaseUser);

    if (firebaseUser.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      setStudentData(null);
      setLoading(false);
      return;
    }

    setIsAdmin(false);
    try {
      const studentDocRef = doc(db, 'students', firebaseUser.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        const data = studentDocSnap.data() as Omit<Student, 'id'>;
        setStudentData({ id: studentDocSnap.id, ...data });
      } else {
         console.warn("No student data found for this user in Firestore.");
         // This might happen if admin creates auth user but firestore doc fails.
         // For now, we treat them as a user with no specific student role.
         setStudentData(null);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Öğrenci verileri alınamadı. Lütfen tekrar giriş yapın.',
        variant: 'destructive',
      });
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true); // Always start with loading true on auth state change
      fetchStudentData(firebaseUser);
    });

    return () => unsubscribe();
  }, [fetchStudentData]);


  useEffect(() => {
    // Wait until loading is false before doing any routing
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/login';
    const isProtectedRoute = protectedRoutes.includes(pathname);
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

    // If there's no user
    if (!user) {
      // and they are not on the login page, redirect them there.
      if (!isAuthPage) {
        router.push('/login');
      }
    } 
    // If there IS a user
    else {
      // and they are on the login page, redirect to home.
      if (isAuthPage) {
        router.push('/');
      }
      // and they are trying to access an admin route but are not an admin
      else if (isAdminRoute && !isAdmin) {
        toast({
          title: 'Erişim Engellendi',
          description: 'Admin paneline erişim yetkiniz yok.',
          variant: 'destructive',
        });
        router.push('/');
      }
    }
  }, [user, isAdmin, loading, pathname, router, toast]);

  const login = (email: string, pass: string) => {
    setLoading(true);
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    // onAuthStateChanged will handle setting user, studentData, isAdmin and loading state
  };
  
  const refreshStudentData = useCallback(() => {
    if(user) {
      setLoading(true);
      fetchStudentData(user);
    }
  }, [user, fetchStudentData]);

  return (
    <AuthContext.Provider value={{ user, studentData, loading, isAdmin, login, logout, refreshStudentData }}>
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
