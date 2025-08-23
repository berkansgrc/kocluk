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
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  studentData: Student | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  refreshStudentData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const protectedRoutes = ['/', '/reports', '/resources'];
const adminRoute = '/admin';

// Güvenlik: Admin e-postasını bir ortam değişkenine taşımak en iyisidir.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchStudentData = useCallback(async (firebaseUser: User) => {
    if (!firebaseUser) {
      setStudentData(null);
      return;
    };
    // Admin kullanıcısı için öğrenci verisi aramaya gerek yok.
    if(firebaseUser.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setStudentData(null); // Admin bir öğrenci değil.
        return;
    }

    setIsAdmin(false);
    
    const studentDocRef = doc(db, "students", firebaseUser.uid);
    const studentDocSnap = await getDoc(studentDocRef);

    if (studentDocSnap.exists()) {
      const data = studentDocSnap.data() as Omit<Student, 'id'>;
      setStudentData({ id: studentDocSnap.id, ...data });
    } else {
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
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchStudentData]);

  useEffect(() => {
    if (loading) return;

    const isProtectedRoute = protectedRoutes.includes(pathname);
    const isAdminRoutePath = pathname.startsWith(adminRoute);

    if (!user && (isProtectedRoute || isAdminRoutePath)) {
      router.push('/login');
    } else if (user && !isAdmin && isAdminRoutePath) {
      toast({
        title: 'Erişim Engellendi',
        description: 'Admin paneline erişim yetkiniz yok.',
        variant: 'destructive',
      });
      router.push('/');
    } else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, isAdmin, loading, pathname, router, toast]);


  const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signup = async (email: string, pass: string) => {
    if (email === ADMIN_EMAIL) {
        throw new Error("Admin hesabı bu şekilde oluşturulamaz.");
    }
    const q = query(collection(db, "students"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error("Bu e-posta adresiyle kayıt olmaya izniniz yok. Lütfen bir yönetici ile iletişime geçin.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    return userCredential;
  };

  const logout = async () => {
    setStudentData(null);
    setIsAdmin(false);
    await signOut(auth);
    router.push('/login');
  };
  
  const refreshStudentData = useCallback(() => {
    if(user) {
      fetchStudentData(user);
    }
  }, [user, fetchStudentData]);


  return (
    <AuthContext.Provider value={{ user, studentData, loading, isAdmin, login, signup, logout, refreshStudentData }}>
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
