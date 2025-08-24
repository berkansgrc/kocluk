
'use client';

import { useMemo } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { Student } from '@/lib/types';

interface NotificationCenterProps {
  student: Student;
  onClear: () => void;
}

export default function NotificationCenter({ student, onClear }: NotificationCenterProps) {
  
  const hasUnreadNotifications = useMemo(() => {
    return (student.assignments || []).some(a => a.isNew) || student.isPlanNew;
  }, [student]);

  const sortedNotifications = useMemo(() => {
    const allNotifications: { text: string, date: Date }[] = [];

    if (student.isPlanNew) {
      // Give plan a very recent date to appear on top
      allNotifications.push({ type: 'plan', text: 'Haftalık planın güncellendi.', date: new Date() });
    }

    (student.assignments || []).forEach(a => {
        allNotifications.push({
            type: 'assignment',
            text: `Yeni Ödev: ${a.title}`,
            date: a.assignedAt.toDate() // Convert Firestore Timestamp to JS Date
        });
    });

    // Sort notifications by date, newest first
    allNotifications.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Return the last 3
    return allNotifications.slice(0, 3);
  }, [student.assignments, student.isPlanNew]);
  

  const handleOpenChange = (open: boolean) => {
    // When the popover is opened, clear the notifications (which just removes the red dot)
    if (open && hasUnreadNotifications) {
      onClear();
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnreadNotifications && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          <span className="sr-only">Bildirimleri Aç</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Bildirimler</h4>
            <p className="text-sm text-muted-foreground">
              Sana gelen en son güncellemeler.
            </p>
          </div>
          <div className="grid gap-2">
            {sortedNotifications.length > 0 ? (
              sortedNotifications.map((notification, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
                >
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.text}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                 <CheckCheck className="h-10 w-10 text-muted-foreground mb-2"/>
                 <p className="text-sm text-muted-foreground">Yeni bir bildirim yok.</p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
