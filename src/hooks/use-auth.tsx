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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
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
  signup: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  refreshStudentData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const protectedRoutes = ['/', '/reports', '/resources'];
const adminRoute = '/admin';

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
        // This case might happen if admin deletes the student from db but auth record remains.
        console.warn("No student data found for this user in Firestore.");
        setStudentData(null);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
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

    const isProtectedRoute = protectedRoutes.includes(pathname) || pathname.startsWith(adminRoute);

    if (!user && isProtectedRoute) {
      router.push('/login');
    } else if (user && !isAdmin && pathname.startsWith(adminRoute)) {
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

    // Check if a student document with this email exists (created by admin)
    const q = query(collection(db, "students"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Bu e-posta adresiyle kayıt olmaya izniniz yok. Lütfen bir yönetici ile iletişime geçin.");
    }
    
    // Check if an auth user already exists for this email
     const studentDoc = querySnapshot.docs[0];
     if(studentDoc.data().authLinked) {
        throw new Error("Bu e-posta adresiyle zaten bir hesap oluşturulmuş.");
     }

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newStudentUser = userCredential.user;

    // After creating the user, update the corresponding student document with the new UID.
    // This is not ideal, as the original doc was created with a random ID. Let's assume admin now creates doc with email as ID.
    // A better approach is for admin to just add email to a list, and on signup, a new doc is created with UID.
    // Let's stick to the current logic: admin creates a student doc.
    
    const studentInfo = studentDoc.data();
    
    // Create a new document with the UID as the ID
    const studentDocRef = doc(db, 'students', newStudentUser.uid);
    await setDoc(studentDocRef, {
        name: studentInfo.name,
        email: studentInfo.email,
        weeklyQuestionGoal: 100,
        studySessions: [],
    });

    return userCredential;
  };

  const logout = async () => {
    setLoading(true);
    setUser(null);
    setStudentData(null);
    setIsAdmin(false);
    await signOut(auth);
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
