
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

  useEffect(() => {
    if (hasNewAssignment || hasNewPlan) {
      setIsVisible(true);
      // Automatically clear notifications after a delay when the component mounts with new info
      const timer = setTimeout(() => {
        onClear();
      }, 5000); // Clear after 5 seconds to ensure user sees it
      return () => clearTimeout(timer);
    }
  }, [hasNewAssignment, hasNewPlan, onClear]);


  if (!isVisible || (!hasNewAssignment && !hasNewPlan)) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    onClear();
  }

  return (
    <Alert className="mt-4 relative">
      <Megaphone className="h-4 w-4" />
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleClose}>
        <X className="h-4 w-4" />
      </Button>
      <AlertTitle>Hey, sana yeni haberler var!</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5">
            {hasNewAssignment && <li>Yeni bir ödevin var. Ödevler listesinden kontrol edebilirsin.</li>}
            {hasNewPlan && <li>Bu haftaki çalışma planın güncellendi. Aşağıdan göz atabilirsin.</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
