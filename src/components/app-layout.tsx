'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
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
import { BarChart3, BookOpen, LayoutDashboard, LogOut, Shield, Target } from 'lucide-react';
import { Button } from './ui/button';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast'; // useToast hook'unu import et

const navItems = [
  { href: '/', label: 'Anasayfa', icon: LayoutDashboard, adminOnly: false },
  { href: '/reports', label: 'Raporlarım', icon: BarChart3, adminOnly: false },
  { href: '/resources', label: 'Kaynaklar', icon: BookOpen, adminOnly: false },
  { href: '/admin', label: 'Admin Paneli', icon: Shield, adminOnly: true },
];

function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
                Matematikçi AI
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
              <SidebarMenuButton onClick={logout}>
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
