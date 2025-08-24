
'use client';

import { useEffect, useState } from 'react';
import type { Student } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Megaphone, X } from 'lucide-react';
import { Button } from '../ui/button';

interface NotificationAlertProps {
  student: Student;
  onClear: () => void;
}

export default function NotificationAlert({ student, onClear }: NotificationAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const hasNewAssignment = student.assignments?.some(a => a.isNew);
  const hasNewPlan = student.isPlanNew;

  const handleClose = () => {
    setIsVisible(false);
    onClear();
  }

  useEffect(() => {
    if (hasNewAssignment || hasNewPlan) {
      setIsVisible(true);
      // Automatically clear notifications after a delay when the component mounts with new info
      const timer = setTimeout(() => {
        handleClose();
      }, 8000); // Clear after 8 seconds to ensure user sees it
      return () => clearTimeout(timer);
    } else {
        setIsVisible(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNewAssignment, hasNewPlan, student.id]); // Add student.id to re-trigger on student change


  if (!isVisible) {
    return null;
  }

  return (
    <Alert className="mt-4 relative">
      <Megaphone className="h-4 w-4" />
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleClose}>
        <X className="h-4 w-4" />
      </Button>
      <AlertTitle>Hey, sana yeni haberler var!</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5 space-y-1 mt-2">
            {hasNewAssignment && <li>Yeni bir ödevin var. Ödevler listesinden kontrol edebilirsin.</li>}
            {hasNewPlan && <li>Bu haftaki çalışma planın güncellendi. Aşağıdan göz atabilirsin.</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
