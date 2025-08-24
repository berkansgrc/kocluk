
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student, StudySession } from '@/lib/types';

import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import PerformanceEffortMatrix from '@/components/reports/performance-effort-matrix';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReportData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        const data = studentDocSnap.data();
        setStudySessions(data.studySessions || []);
      } else {
        console.warn("No student data found for this user in Firestore.");
        setStudySessions([]);
      }
    } catch (error) {
      console.error("Error fetching student data for reports:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Rapor verileri alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchReportData();
    }
  }, [authLoading, fetchReportData]);


  if (loading || authLoading) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
           <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-3">
             <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-2">
             <Skeleton className="h-96 w-full" />
          </div>
        </div>
        <div className="grid gap-6 mt-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Raporlarım
          </h1>
          <p className="text-muted-foreground">
            Performansını ve çalışma alışkanlıklarını detaylıca analiz et.
          </p>
        </div>
      </div>
      <Separator />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-6">
        <div className="lg:col-span-3">
          <SolvedQuestionsChart studySessions={studySessions} />
        </div>
        <div className="lg:col-span-2">
          <StudyDurationChart studySessions={studySessions} />
        </div>
      </div>
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Konu Güçlü & Zayıf Yön Matrisi</CardTitle>
            <CardDescription>
              Farklı derslerdeki ve konulardaki performansınızı analiz edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StrengthWeaknessMatrix studySessions={studySessions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performans/Efor Matrisi</CardTitle>
            <CardDescription>
              Konulara harcadığınız zaman ile o konudaki başarınızı karşılaştırın.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceEffortMatrix studySessions={studySessions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
