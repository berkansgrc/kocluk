
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
import { Award, BarChart3, BookOpen, LayoutDashboard, LogOut, Shield, Target, Library, User } from 'lucide-react';
import { Button } from './ui/button';
import { AuthProvider, useAuth, protectedRoutes, adminRoutes, parentRoutes } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/', label: 'Anasayfa', icon: LayoutDashboard, adminOnly: false, parentHidden: true },
  { href: '/reports', label: 'Raporlarım', icon: BarChart3, adminOnly: false, parentHidden: true },
  { href: '/achievements', label: 'Başarımlarım', icon: Award, adminOnly: false, parentHidden: true },
  { href: '/resources', label: 'Kaynaklar', icon: BookOpen, adminOnly: false, parentHidden: true },
  { href: '/parent/dashboard', label: 'Veli Paneli', icon: User, parentOnly: true },
  { href: '/admin', label: 'Admin Paneli', icon: Shield, adminOnly: true },
  { href: '/admin/library', label: 'Kütüphane', icon: Library, adminOnly: true },
];


function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin, isParent, loading } = useAuth();
  const { toast } = useToast();

   useEffect(() => {
    if (loading) {
      return; 
    }

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) || 
                           adminRoutes.some(route => pathname.startsWith(route)) ||
                           parentRoutes.some(route => pathname.startsWith(route));

    if (!user && isProtectedRoute) {
      router.push('/login');
      return;
    }
    
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    const isParentRoute = parentRoutes.some(route => pathname.startsWith(route));

    if (user) {
        if (!isAdmin && isAdminRoute) {
            toast({
                title: 'Erişim Engellendi',
                description: 'Admin paneline erişim yetkiniz yok.',
                variant: 'destructive',
            });
            router.push('/');
        } else if (!isParent && isParentRoute) {
             toast({
                title: 'Erişim Engellendi',
                description: 'Veli paneline erişim yetkiniz yok.',
                variant: 'destructive',
            });
            router.push('/');
        } else if (isParent && !isParentRoute && !pathname.startsWith('/login')) {
             router.push('/parent/dashboard');
        }
    }


  }, [user, isAdmin, isParent, loading, pathname, router, toast]);

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center">Yükleniyor...</div>;
  }
  
  const visibleNavItems = navItems.filter(item => {
    if (isAdmin) return item.parentOnly !== true;
    if (isParent) return item.parentOnly === true;
    return !item.adminOnly && !item.parentOnly;
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
              <h2 className="text-lg font-semibold tracking-tight font-headline">
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
            <SidebarMenuItem>
              <SidebarMenuButton onClick={async () => {
                 await logout();
                 router.push('/login');
              }}>
                <LogOut/>
                <span>Çıkış Yap</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}


export function AppLayout({ children }: { children: ReactNode }) {
 return (
  <AuthProvider>
    <LayoutContent>{children}</LayoutContent>
  </AuthProvider>
 )
}
