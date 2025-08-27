
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Student, WeeklyPlanItem } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Check, Square } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

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

  const handleToggleComplete = async (task: WeeklyPlanItem) => {
    if (!user || !studentData) return;
     try {
        const updatedPlan = (studentData.weeklyPlan || []).map(p => 
            p.id === task.id ? { ...p, isCompleted: !p.isCompleted } : p
        );
        const studentDocRef = doc(db, 'students', user.uid);
        await updateDoc(studentDocRef, { weeklyPlan: updatedPlan });
        setStudentData(prev => prev ? { ...prev, weeklyPlan: updatedPlan } : null);
    } catch(e) {
        console.error("Error updating task status:", e);
        toast({ title: 'Hata', description: 'Görev durumu güncellenemedi.', variant: 'destructive' });
    }
  };


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
  
  const weeklyPlan = studentData?.weeklyPlan || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Haftalık Planım
        </h1>
        <p className="text-muted-foreground">
          Koçun tarafından senin için oluşturulan haftalık yol haritası.
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
              <div className="grid grid-cols-7 min-w-[1000px]">
                {dayOrder.map(day => (
                  <div key={day} className="flex-1 border-r last:border-r-0">
                    <div className="p-3 font-semibold text-center bg-muted/50 border-b">{day}</div>
                    <div className="p-2 space-y-3 min-h-[50vh]">
                       {weeklyPlan.filter(item => item.day === day).map((item, index) => (
                           <div key={item.id} className="p-3 rounded-lg bg-card border shadow-sm">
                               <div className="flex items-start gap-3">
                                   <Checkbox 
                                        id={`plan-task-${item.id}`}
                                        className='mt-1'
                                        checked={item.isCompleted}
                                        onCheckedChange={() => handleToggleComplete(item)}
                                    />
                                    <div className="flex-1">
                                        <label htmlFor={`plan-task-${item.id}`} className="font-bold text-primary has-[[data-state=checked]]:line-through has-[[data-state=checked]]:text-muted-foreground">{item.subject}</label>
                                        <p className="text-sm font-medium mt-1">{item.topic}</p>
                                        <p className="text-xs text-muted-foreground mt-2">{item.goal}</p>
                                    </div>
                               </div>
                           </div>
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
                    Koçun tarafından haftalık planın oluşturulduğunda burada görünecek.
                </p>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
