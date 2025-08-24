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
} from 'firebase/auth';
import { 
  doc,
  getDoc,
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
      setStudentData(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check if the user is the admin based on email
    if (firebaseUser.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      setStudentData(null); // Admin does not have student data
      setLoading(false);
      return;
    }

    // Regular student user
    setIsAdmin(false);
    try {
      const studentDocRef = doc(db, 'students', firebaseUser.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        const data = studentDocSnap.data() as Omit<Student, 'id'>;
        setStudentData({ id: studentDocSnap.id, ...data });
      } else {
        console.warn("No student data found for this user in Firestore. Logging out.");
        await signOut(auth); // Force logout if no corresponding DB entry
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Öğrenci verileri alınamadı. Lütfen tekrar giriş yapın.',
        variant: 'destructive',
      });
      await signOut(auth); // Force logout on error
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      await fetchStudentData(firebaseUser);
    });

    return () => unsubscribe();
  }, [fetchStudentData]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';
    const isProtectedRoute = protectedRoutes.includes(pathname);
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

    if (!user) {
      // If not logged in and trying to access a protected or admin route
      if (isProtectedRoute || isAdminRoute) {
        router.push('/login');
      }
    } else {
      // If logged in
      if (isAuthPage) {
        // and on login page, redirect to home
        router.push('/');
      } else if (isAdminRoute && !isAdmin) {
        // and trying to access admin route as non-admin, redirect and show error
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
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setStudentData(null);
    setIsAdmin(false);
    router.push('/login');
    setLoading(false);
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
