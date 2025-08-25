
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Hourglass } from 'lucide-react';


export default function TotalTimeCard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTotalTime = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        const studentData = studentDocSnap.data() as Student;
        const total = (studentData.studySessions || []).reduce((sum, session) => sum + session.durationInMinutes, 0);
        setTotalMinutes(total);
      }
    } catch (error) {
      console.error("Error fetching total study time:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Toplam çalışma süresi alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchTotalTime();
    }
  }, [authLoading, fetchTotalTime]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} saat ${remainingMinutes} dakika`;
  };

  if (loading || authLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center">
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40 mt-2" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toplam Çalışma Süresi</CardTitle>
        <CardDescription>
          Bugüne kadar platforma kaydettiğin toplam çalışma miktarı.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center">
        <Hourglass className="w-12 h-12 text-primary mb-4" />
        <p className="text-3xl font-bold">{totalMinutes}</p>
        <p className="text-muted-foreground">Toplam Dakika</p>
        <p className="text-lg font-semibold mt-4">{formatDuration(totalMinutes)}</p>
      </CardContent>
    </Card>
  );
}
