

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Student, Assignment, CalendarEvent, WeeklyPlanItem } from '@/lib/types';
import WelcomeHeader from '@/components/dashboard/welcome-header';
import WeeklyProgress from '@/components/dashboard/weekly-progress';
import StudySessionForm from '@/components/dashboard/study-session-form';
import AIFeedback from '@/components/dashboard/ai-feedback';
import AIRiskAnalyzer from '@/components/dashboard/ai-risk-analyzer';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import AssignmentsList from '@/components/dashboard/assignments-list';
import DailyStreak from '@/components/dashboard/daily-streak';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { achievementChecks, allAchievements } from '@/lib/achievements';
import { Award, Check, ClipboardCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import EventCalendar from '@/components/dashboard/event-calendar';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';


function TodaysPlan({ plan, onToggle, studentId }: { plan: WeeklyPlanItem[], onToggle: () => void, studentId: string }) {
    
    const { toast } = useToast();

    const handleToggleComplete = async (task: WeeklyPlanItem) => {
        try {
            const studentDocRef = doc(db, 'students', studentId);
            const studentDoc = await getDoc(studentDocRef);
            if(studentDoc.exists()) {
                const studentData = studentDoc.data() as Student;
                const updatedPlan = (studentData.weeklyPlan || []).map(p => 
                    p.id === task.id ? { ...p, isCompleted: !p.isCompleted } : p
                );
                await updateDoc(studentDocRef, { weeklyPlan: updatedPlan });
                onToggle();
                 toast({ title: 'Başarılı', description: 'Görev durumu güncellendi.' });
            }
        } catch(e) {
            console.error("Error updating task status:", e);
            toast({ title: 'Hata', description: 'Görev durumu güncellenemedi.', variant: 'destructive' });
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck /> Bugünün Planı</CardTitle>
                <CardDescription>Koçun tarafından bugün için belirlenen hedefler.</CardDescription>
            </CardHeader>
            <CardContent>
                {plan.length > 0 ? (
                    <ul className="space-y-3">
                        {plan.map(task => (
                            <li key={task.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                                <Checkbox
                                    id={`task-${task.id}`}
                                    checked={task.isCompleted}
                                    onCheckedChange={() => handleToggleComplete(task)}
                                    aria-label={`Mark ${task.goal} as complete`}
                                />
                                <div className='flex-1'>
                                    <label htmlFor={`task-${task.id}`} className="font-semibold text-sm leading-none has-[[data-state=checked]]:line-through has-[[data-state=checked]]:text-muted-foreground">
                                        <span className="font-bold text-primary">{task.subject}:</span> {task.topic}
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">{task.goal}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Bugün için planlanmış bir görevin yok. Dinlenmenin tadını çıkar!</p>
                )}
            </CardContent>
        </Card>
    );
}

function PageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAndAwardAchievements = useCallback(async (student: Student) => {
    if (!user) return;

    const newlyUnlocked: string[] = [];
    const currentAchievements = student.unlockedAchievements || [];

    for (const achievement of allAchievements) {
      if (!currentAchievements.includes(achievement.id)) {
        const hasUnlocked = achievementChecks[achievement.id]?.(student);
        if (hasUnlocked) {
          newlyUnlocked.push(achievement.id);
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      const updatedAchievements = [...currentAchievements, ...newlyUnlocked];
      try {
        const studentDocRef = doc(db, 'students', user.uid);
        await updateDoc(studentDocRef, {
          unlockedAchievements: updatedAchievements
        });
        setStudentData(prev => prev ? { ...prev, unlockedAchievements: updatedAchievements } : null);
        
        for (const achievementId of newlyUnlocked) {
           const achievement = allAchievements.find(a => a.id === achievementId);
           if (achievement) {
             toast({
                title: 'Başarı Kazanıldı!',
                description: `Tebrikler, "${achievement.name}" başarısını kazandın!`,
              });
           }
        }
      } catch (error) {
        console.error("Başarı güncellenirken hata:", error);
      }
    }
  }, [user, toast]);

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
          studySessions: data.studySessions || [],
          assignments: data.assignments || [],
          resources: data.resources || [],
          weeklyPlan: data.weeklyPlan || [],
          unlockedAchievements: data.unlockedAchievements || [],
          calendarEvents: data.calendarEvents || [],
        };
        setStudentData(validatedData);
        await checkAndAwardAchievements(validatedData);
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
  }, [user, toast, checkAndAwardAchievements]);

  useEffect(() => {
    if (!authLoading) {
      fetchStudentData();
    }
  }, [authLoading, fetchStudentData]);

  const handleSessionAdded = () => {
    setLoading(true);
    fetchStudentData();
  };

  const clearNotifications = async () => {
    if (!user || !studentData) return;
    let hasChanges = false;
    const updatedAssignments = (studentData.assignments || []).map(a => {
      if (a.isNew) {
        hasChanges = true;
        return { ...a, isNew: false };
      }
      return a;
    });

    const updates: { assignments?: Assignment[], isPlanNew?: boolean } = {};
    if (hasChanges) {
      updates.assignments = updatedAssignments;
    }
    if (studentData.isPlanNew) {
      hasChanges = true;
      updates.isPlanNew = false;
    }

    if (hasChanges) {
      try {
        const studentDocRef = doc(db, 'students', user.uid);
        await updateDoc(studentDocRef, updates);
        setStudentData(prev => prev ? { ...prev, ...updates } : null);
      } catch (error) {
        console.error("Error clearing notifications:", error);
      }
    }
  };

    if (loading || authLoading) {
      return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card><CardHeader className='pb-2'><Skeleton className='h-7 w-24' /><Skeleton className='h-4 w-32 mt-1'/></CardHeader><CardContent><Skeleton className='h-4 w-24' /></CardContent></Card>
                <Card><CardHeader className='pb-2'><Skeleton className='h-7 w-24' /><Skeleton className='h-4 w-32 mt-1'/></CardHeader><CardContent><Skeleton className='h-4 w-24' /></CardContent></Card>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <Skeleton className='w-12 h-12 rounded-lg' />
                  <div className='flex-1 space-y-1'>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-[60%]" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className='flex items-center justify-between'><Skeleton className='h-5 w-32' /> <Skeleton className='h-8 w-20' /></div>
                  <div className='flex items-center justify-between'><Skeleton className='h-5 w-24' /> <Skeleton className='h-8 w-20' /></div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
    }
  
    if (studentData) {
      const todayString = format(new Date(), 'EEEE', { locale: tr });
      const todaysPlan = (studentData.weeklyPlan || []).filter(task => task.day === todayString);
      
      return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <WelcomeHeader student={studentData} onClearNotifications={clearNotifications} />
          <Separator />
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <div className="space-y-6">
              <TodaysPlan plan={todaysPlan} onToggle={fetchStudentData} studentId={studentData.id} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <WeeklyProgress
                  studySessions={studentData.studySessions || []}
                  weeklyGoal={studentData.weeklyQuestionGoal}
                />
                <DailyStreak studySessions={studentData.studySessions || []} />
              </div>
               <AIRiskAnalyzer 
                  studentName={studentData.name}
                  studySessions={studentData.studySessions || []}
                  weeklyGoal={studentData.weeklyQuestionGoal}
                />
              <AIFeedback
                studentName={studentData.name}
                studySessions={studentData.studySessions || []}
              />
              <AssignmentsList assignments={studentData.assignments || []} />
            </div>
            <div className="space-y-6">
              <StudySessionForm studentId={studentData.id} onSessionAdded={handleSessionAdded} />
            </div>
          </div>
        </div>
      );
    }
  
    return <div className="p-8">Yükleniyor veya kullanıcı verisi bulunamadı...</div>;
}


export default function DashboardPage() {
  const { loading, user, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; 
    }
    if (!user) {
      router.push('/login');
      return;
    }
    if (isAdmin) {
      router.push('/admin');
    }
  }, [user, loading, isAdmin, router]);

  if (loading || !user || isAdmin) {
    return <div className="flex h-screen w-screen items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <AppLayout>
      <PageContent />
    </AppLayout>
  )
}
