
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student, StudySession } from '@/lib/types';
import WelcomeHeader from '@/components/dashboard/welcome-header';
import WeeklyProgress from '@/components/dashboard/weekly-progress';
import DailyStreak from '@/components/dashboard/daily-streak';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fromUnixTime, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { allAchievements } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Badge } from '@/components/ui/badge';


export default function ParentDashboardPage() {
  const { user, loading: authLoading, studentIdForParent } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = useCallback(async () => {
    if (!user || !studentIdForParent) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', studentIdForParent);
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
      } else {
        console.warn("No student data found for this parent's child in Firestore.");
        toast({ title: 'Hata', description: 'Öğrenci verisi bulunamadı.', variant: 'destructive' });
        setStudentData(null);
      }
    } catch (error) {
      console.error("Error fetching student data for parent:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Öğrenci verileri alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, studentIdForParent, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchStudentData();
    }
  }, [authLoading, fetchStudentData]);


  if (loading || authLoading || !studentData) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid gap-6 mt-6">
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }
  
  const recentSessions = (studentData.studySessions || [])
    .map(s => ({
        ...s,
        date: s.date && typeof s.date.seconds === 'number'
            ? fromUnixTime(s.date.seconds)
            : new Date(s.date)
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);
  
  const unlockedAchievementIds = new Set(studentData?.unlockedAchievements || []);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <WelcomeHeader name={`Veli Paneli - ${studentData.name}`} />
       <p className="text-muted-foreground -mt-4">
          Çocuğunuzun platformdaki ilerlemesini ve genel durumunu buradan takip edebilirsiniz.
        </p>
      <Separator />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WeeklyProgress
            studySessions={studentData.studySessions || []}
            weeklyGoal={studentData.weeklyQuestionGoal}
        />
        <DailyStreak studySessions={studentData.studySessions || []} />
        <Card>
            <CardHeader className='pb-2'>
                <CardTitle>Genel Başarı</CardTitle>
                <CardDescription>Tüm zamanlardaki soru başarı oranı.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className='text-3xl font-bold'>
                    {(
                        (studentData.studySessions.reduce((acc, s) => acc + s.questionsCorrect, 0) /
                        studentData.studySessions.reduce((acc, s) => acc + s.questionsSolved, 1)) * 100
                    ).toFixed(1)}%
                </p>
            </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card>
            <CardHeader>
                <CardTitle>Son Çalışmalar</CardTitle>
                <CardDescription>Çocuğunuzun kaydettiği en son 5 çalışma.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Ders</TableHead>
                            <TableHead className='text-right'>Başarı</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentSessions.length > 0 ? recentSessions.map(session => (
                            <TableRow key={session.id}>
                                <TableCell>{format(session.date, 'dd MMM yyyy', { locale: tr })}</TableCell>
                                <TableCell>{session.subject} - {session.topic}</TableCell>
                                <TableCell className='text-right'>
                                    {session.questionsSolved > 0 ? 
                                        `${((session.questionsCorrect / session.questionsSolved) * 100).toFixed(0)}%`
                                        : 'N/A'
                                    }
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className='text-center'>Kayıtlı çalışma yok.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Atanmış Ödevler</CardTitle>
                <CardDescription>Koçu tarafından atanan ödevlerin durumu.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {(studentData.assignments && studentData.assignments.length > 0) ? 
                        studentData.assignments.sort((a,b) => b.assignedAt.toMillis() - a.assignedAt.toMillis()).map(ass => (
                            <li key={ass.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                                <span>{ass.title}</span>
                                <Badge variant='outline'>Atandı</Badge>
                            </li>
                        ))
                        : <p className="text-sm text-muted-foreground">Henüz atanmış bir ödev bulunmuyor.</p>
                    }
                </ul>
            </CardContent>
        </Card>
      </div>
      
        <Card>
            <CardHeader>
                <CardTitle>Güçlü ve Zayıf Yönler</CardTitle>
                <CardDescription>Farklı konulardaki performans analizi.</CardDescription>
            </CardHeader>
            <CardContent>
                <StrengthWeaknessMatrix studySessions={studentData.studySessions} />
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
            <CardTitle>Kazanılan Başarımlar</CardTitle>
            <CardDescription>Çocuğunuzun platformda kazandığı rozetler.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             {allAchievements.map((achievement) => {
                const isUnlocked = unlockedAchievementIds.has(achievement.id);
                const Icon = achievement.icon;
                return (
                    <div
                    key={achievement.id}
                    className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border",
                        isUnlocked ? 'border-accent bg-accent/10' : 'bg-muted/40'
                    )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                            isUnlocked ? 'bg-accent text-accent-foreground' : 'bg-muted-foreground/20 text-muted-foreground/60'
                            )}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className={cn("font-semibold", !isUnlocked && "text-muted-foreground")}>
                                {achievement.name}
                            </p>
                            <p className={cn("text-xs", !isUnlocked && "text-muted-foreground/80")}>
                                {achievement.description}
                            </p>
                        </div>
                   </div>
                );
            })}
        </CardContent>
      </Card>

    </div>
  );
}
