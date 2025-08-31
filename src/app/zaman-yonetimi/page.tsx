
'use client';

import { AppLayout } from '@/components/app-layout';
import PomodoroTimer from '@/components/zaman-yonetimi/pomodoro-timer';
import TotalTimeCard from '@/components/zaman-yonetimi/total-time-card';
import { Separator } from '@/components/ui/separator';
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student } from '@/lib/types';


function ZamanYonetimiPageContent() {
  const { user } = useAuth();
  const [totalPomodoroMinutes, setTotalPomodoroMinutes] = useState(0);
  const [studentData, setStudentData] = useState<Student | null>(null);

  // We only need the studentId, but fetching student data might be useful for other things later
  const fetchStudentData = useCallback(async () => {
    if (!user) return;
    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        setStudentData({ id: studentDocSnap.id, ...studentDocSnap.data() } as Student);
      }
    } catch (error) {
      console.error("Error fetching student data for pomodoro:", error);
    }
  }, [user]);

  useState(() => {
    fetchStudentData();
  });

  const handleWorkSessionComplete = () => {
    setTotalPomodoroMinutes(prev => prev + 25); // 25 is the work session duration
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Zaman Yönetimi
          </h1>
          <p className="text-muted-foreground">
            Pomodoro tekniği ile verimliliğini artır ve çalışma süreni takip et.
          </p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mt-6">
        <div className="lg:col-span-2">
           <PomodoroTimer 
            onWorkSessionComplete={handleWorkSessionComplete}
            studentId={studentData?.id}
            onSessionAdded={fetchStudentData} // Re-fetch to update dashboard if needed elsewhere
           />
        </div>
        <div className="lg:col-span-1">
            <TotalTimeCard totalMinutes={totalPomodoroMinutes} />
        </div>
      </div>
    </div>
  );
}


export default function ZamanYonetimiPage() {
    return (
        <AppLayout>
            <ZamanYonetimiPageContent />
        </AppLayout>
    )
}
