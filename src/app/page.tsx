
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import WelcomeHeader from '@/components/dashboard/welcome-header';
import WeeklyProgress from '@/components/dashboard/weekly-progress';
import StudySessionForm from '@/components/dashboard/study-session-form';
import AIFeedback from '@/components/dashboard/ai-feedback';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import AssignmentsList from '@/components/dashboard/assignments-list';
import DailyStreak from '@/components/dashboard/daily-streak';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    // No need to fetch data for admin on this page
    if(isAdmin) {
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
          studySessions: data.studySessions || [],
          assignments: data.assignments || [],
          resources: data.resources || [],
          weeklyPlan: data.weeklyPlan || [],
        };
        setStudentData(validatedData);
      } else {
        console.warn("No student data found for this user in Firestore.");
        setStudentData(null);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Öğrenci verileri alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, toast]);


  useEffect(() => {
    if (!authLoading) {
      fetchStudentData();
    }
  }, [authLoading, fetchStudentData]);
  
  const handleSessionAdded = () => {
    // Re-fetch data to update all components
    setLoading(true);
    fetchStudentData();
  }


  if (loading || authLoading) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Adminler için özel bir karşılama ekranı gösterilebilir.
  if (isAdmin) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <WelcomeHeader name="Admin" />
        <Separator />
        <p>Admin paneline hoş geldiniz. Öğrencileri ve uygulama ayarlarını yönetmek için lütfen Admin Paneli sayfasını ziyaret edin.</p>
      </div>
    );
  }

  // Öğrenci verisi mevcutsa öğrenci dashboard'ını göster
  if (studentData) {
    const weeklyPlan = studentData.weeklyPlan || [];
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <WelcomeHeader name={studentData.name} />
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <WeeklyProgress
                studySessions={studentData.studySessions || []}
                weeklyGoal={studentData.weeklyQuestionGoal}
              />
              <DailyStreak studySessions={studentData.studySessions || []} />
            </div>
            <AIFeedback
              studentName={studentData.name}
              studySessions={studentData.studySessions || []}
            />
             <AssignmentsList assignments={studentData.assignments || []} />
          </div>
          <div className="lg:col-span-2">
            <StudySessionForm studentId={studentData.id} onSessionAdded={handleSessionAdded} />
          </div>
        </div>
         {weeklyPlan.length > 0 && (
          <div className="pt-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Bu Haftaki Çalışma Planın</CardTitle>
                      <CardDescription>Koçun tarafından senin için özel olarak hazırlanan yol haritası.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="rounded-md border">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Gün</TableHead>
                                      <TableHead>Ders</TableHead>
                                      <TableHead>Konu</TableHead>
                                      <TableHead>Hedef</TableHead>
                                      <TableHead>Koçunun Notu</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {weeklyPlan.map((item, index) => (
                                      <TableRow key={index}>
                                          <TableCell className="font-medium">{item.day}</TableCell>
                                          <TableCell>{item.subject}</TableCell>
                                          <TableCell>{item.topic}</TableCell>
                                          <TableCell>{item.goal}</TableCell>
                                          <TableCell className='text-muted-foreground italic'>{item.reason}</TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
              </Card>
          </div>
        )}
      </div>
    );
  }

  // Bu duruma normalde gelinmemeli, ancak bir fallback olarak eklendi.
  return <div className="p-8">Yükleniyor veya kullanıcı verisi bulunamadı...</div>;
}
