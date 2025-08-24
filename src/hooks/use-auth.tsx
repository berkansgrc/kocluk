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
      setUser(null);
      setStudentData(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setUser(firebaseUser);

    if (firebaseUser.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      setStudentData(null);
    } else {
      setIsAdmin(false);
      try {
        const studentDocRef = doc(db, 'students', firebaseUser.uid);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
          const data = studentDocSnap.data() as Omit<Student, 'id'>;
          // Ensure nested arrays exist to prevent runtime errors
          const validatedData: Student = {
            id: studentDocSnap.id,
            ...data,
            studySessions: data.studySessions || [],
            assignments: data.assignments || [],
          };
          setStudentData(validatedData);
        } else {
          console.warn("No student data found for this user in Firestore.");
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
      }
    }
    setLoading(false);
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true);
      fetchStudentData(firebaseUser);
    });

    return () => unsubscribe();
  }, [fetchStudentData]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';
    const isProtectedRoute = protectedRoutes.includes(pathname) || adminRoutes.some(route => pathname.startsWith(route));

    if (!user && isProtectedRoute) {
      router.push('/login');
    }

    if (user && isAuthPage) {
      router.push('/');
    }
    
    if (user && !isAdmin && adminRoutes.some(route => pathname.startsWith(route))) {
        toast({
          title: 'Erişim Engellendi',
          description: 'Admin paneline erişim yetkiniz yok.',
          variant: 'destructive',
        });
        router.push('/');
    }

  }, [user, isAdmin, loading, pathname, router, toast]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle the rest
    } catch(error) {
      setLoading(false); // Manually set loading to false on error
      throw error; // re-throw error to be caught in login page
    }
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    router.push('/login');
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
