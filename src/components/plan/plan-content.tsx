
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student, WeeklyPlanItem } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck } from 'lucide-react';

const dayOrder = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function PlanContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        const data = studentDocSnap.data() as Omit<Student, 'id'>;
        const validatedData: Student = {
          id: studentDocSnap.id,
          ...data,
          weeklyPlan: data.weeklyPlan || [],
        };
        setStudentData(validatedData);
      } else {
        setStudentData(null);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Plan verileri alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchStudentData();
    }
  }, [authLoading, fetchStudentData]);


  if (loading || authLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Separator />
        <Card className="mt-6">
            <CardHeader>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-80 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-96 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const weeklyPlan = studentData?.weeklyPlan?.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)) || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Haftalık Planım
        </h1>
        <p className="text-muted-foreground">
          Yapay zeka koçun tarafından senin için oluşturulan haftalık yol haritası.
        </p>
      </div>
      <Separator />

      <Card className="mt-6 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Haftalık Ders Programı</CardTitle>
          <CardDescription>Bu haftaki hedeflerine odaklanarak verimli bir hafta geçir.</CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyPlan.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <div className="grid grid-cols-7 min-w-[800px]">
                {dayOrder.map(day => (
                  <div key={day} className="flex-1 border-r last:border-r-0">
                    <div className="p-3 font-semibold text-center bg-muted/50 border-b">{day}</div>
                    <div className="p-2 space-y-3 min-h-[50vh]">
                       {weeklyPlan.filter(item => item.day === day).map((item, index) => (
                        item.subject === 'Dinlenme Günü' ? (
                             <div key={index} className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">
                                <p className="font-semibold">{item.subject}</p>
                                <p className="text-xs">{item.goal}</p>
                            </div>
                        ) : (
                            <div key={index} className="p-3 rounded-lg bg-card border shadow-sm">
                                <p className="font-bold text-primary">{item.subject}</p>
                                <p className="text-sm font-medium mt-1">{item.topic}</p>
                                <p className="text-xs text-muted-foreground mt-2">{item.goal}</p>
                                {item.reason && <p className="text-xs text-amber-600 italic mt-2 pt-2 border-t">Koç Notu: {item.reason}</p>}
                            </div>
                        )
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground bg-muted/20 rounded-lg">
                <CalendarCheck className="w-16 h-16 mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Henüz Bir Planın Yok</h3>
                <p className="mt-2 max-w-md">
                    Yapay zeka destekli haftalık planın oluşturulduğunda burada görünecek. Koçunla iletişime geçebilir veya ana sayfadaki bildirimlerini kontrol edebilirsin.
                </p>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
