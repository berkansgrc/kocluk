
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Student, Assignment } from '@/lib/types';
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
import { Award } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function DashboardPage() {
  const { user, loading: authLoading, isAdmin, isParent } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    if (!user || isAdmin || isParent) {
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
  }, [user, isAdmin, isParent, toast, checkAndAwardAchievements]);

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

  if (isAdmin) {
    router.push('/admin');
    return null;
  }
  
  if (isParent) {
    router.push('/parent/dashboard');
    return null;
  }

  if (studentData) {
    const weeklyPlan = studentData.weeklyPlan || [];
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <WelcomeHeader student={studentData} onClearNotifications={clearNotifications} />
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

  return <div className="p-8">Yükleniyor veya kullanıcı verisi bulunamadı...</div>;
}
