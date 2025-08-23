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
} from '@/components/ui/sidebar';
import { BarChart3, BookOpen, LayoutDashboard, Shield, Target } from 'lucide-react';
import { Button } from './ui/button';

const navItems = [
  { href: '/', label: 'Anasayfa', icon: LayoutDashboard },
  { href: '/reports', label: 'Raporlarım', icon: BarChart3 },
  { href: '/resources', label: 'Kaynaklar', icon: BookOpen },
  { href: '/admin', label: 'Admin Paneli', icon: Shield },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link href="/">
                <Target className="w-6 h-6 text-primary" />
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
            {navItems.map((item) => (
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
