

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Award, BarChart3, BookOpen, LayoutDashboard, LogOut, Shield, Target, Library, Clock, ClipboardPen, ClipboardCheck, Users, LineChart, UserCog } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth, protectedRoutes, adminAndTeacherRoutes } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { ThemeToggle } from './theme-toggle';

const navItems = [
  // Student routes
  { href: '/', label: 'Anasayfa', icon: LayoutDashboard, role: 'student' },
  { href: '/plan', label: 'Haftalık Planım', icon: ClipboardCheck, role: 'student' },
  { href: '/reports', label: 'Raporlarım', icon: BarChart3, role: 'student' },
  { href: '/achievements', label: 'Başarımlarım', icon: Award, role: 'student' },
  { href: '/resources', label: 'Kaynaklar', icon: BookOpen, role: 'student' },
  { href: '/zaman-yonetimi', label: 'Zaman Yönetimi', icon: Clock, role: 'student' },
  { href: '/deneme-analizi', label: 'Deneme Analizi', icon: ClipboardPen, role: 'student' },

  // Admin and Teacher routes
  { href: '/admin', label: 'Yönetim Paneli', icon: Shield, role: 'admin-teacher' },
  { href: '/admin/students', label: 'Öğrenciler', icon: Users, role: 'admin-teacher' },
  { href: '/admin/reports', label: 'Genel Raporlar', icon: LineChart, role: 'admin-teacher' },
  { href: '/admin/library', label: 'Kütüphane', icon: Library, role: 'admin-teacher' },

  // Admin only routes
  { href: '/admin/users', label: 'Kullanıcı Yönetimi', icon: UserCog, role: 'admin' },
];


function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin, isTeacher, loading } = useAuth();
  const { toast } = useToast();

   useEffect(() => {
    if (loading) {
      return; 
    }
    
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
    const isAdminTeacherRoute = adminAndTeacherRoutes.some(route => pathname.startsWith(route));

    if (!user && (isProtected || isAdminTeacherRoute)) {
      router.push('/login');
      return;
    }
    
    if (user && !(isAdmin || isTeacher) && isAdminTeacherRoute) {
        toast({
            title: 'Erişim Engellendi',
            description: 'Yönetici paneline erişim yetkiniz yok.',
            variant: 'destructive',
        });
        router.push('/');
    }
  }, [user, isAdmin, isTeacher, loading, pathname, router, toast]);

  if (loading) {
     return (
      <div className="flex h-screen w-screen items-center justify-center">
         <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
         </div>
       </div>
     );
  }
  
  if (!user) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
         Yönlendiriliyor...
       </div>
    );
  }
  
  const visibleNavItems = navItems.filter(item => {
    if (isAdmin) return true;
    if (isTeacher) return item.role === 'admin-teacher' || item.role === 'teacher';
    return item.role === 'student';
  });

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link href="/">
                <Target className="w-6 h-6 text-accent" />
              </Link>
            </Button>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold tracking-tight font-heading">
                Berkan Hoca
              </h2>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {visibleNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
            <div className='flex items-center justify-between p-2'>
                <ThemeToggle />
                <SidebarMenuButton 
                    onClick={async () => {
                        await logout();
                        router.push('/login');
                    }} 
                    className="w-auto px-3"
                    tooltip={{children: 'Çıkış Yap', side: 'right'}}
                    >
                    <LogOut/>
                    <span>Çıkış Yap</span>
                </SidebarMenuButton>
            </div>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
        </header>
        <main className='flex-1 overflow-auto'>
         {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


export function AppLayout({ children }: { children: ReactNode }) {
 return (
    <LayoutContent>{children}</LayoutContent>
 )
}
