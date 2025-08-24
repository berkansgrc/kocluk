
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
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from './use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const protectedRoutes = ['/', '/reports', '/resources'];
const adminRoutes = ['/admin', '/admin/student', '/admin/library'];

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleAuthStateChanged = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    
    setUser(firebaseUser);

    if (firebaseUser.email === ADMIN_EMAIL) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChanged);
    return () => unsubscribe();
  }, [handleAuthStateChanged]);

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
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setLoading(false); // Explicitly set loading to false
    router.push('/login');
  };
  

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
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
