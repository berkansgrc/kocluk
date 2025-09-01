

'use client';

import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, ArrowDown, ArrowUp, BarChart3, Bell, Book, BrainCircuit, CheckCircle, Flame, TrendingDown, TrendingUp, UserPlus, Users, Eye, ArrowUpDown, XCircle } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Student, StudySession } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { startOfWeek, isAfter, fromUnixTime, subDays, startOfDay, isSameDay } from 'date-fns';
import { AppLayout } from '@/components/app-layout';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';


function AdminPageContent() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      let studentsList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Student)
      );

      setStudents(studentsList);
    } catch (error) {
      console.error('Öğrenciler getirilirken hata:', error);
      toast({
        title: 'Hata',
        description:
          'Öğrenci listesi alınamadı. Firestore kurallarınızı kontrol edin.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

 const dashboardStats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const startOfLastWeek = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
    const endOfLastWeek = subDays(startOfThisWeek, 1);

    let activeThisWeek = new Set<string>();
    let activeLastWeek = new Set<string>();
    let solvedToday = 0;
    let solvedYesterday = 0;
    let totalCorrect = 0;
    let totalSolved = 0;

    const topicStats: { [key: string]: { correct: number, solved: number } } = {};
    const groupStats: { [key: string]: { correct: number, solved: number, students: Set<string> } } = {};

    students.forEach(student => {
      (student.studySessions || []).forEach(session => {
        const sessionDate = session.date && typeof session.date.seconds === 'number'
          ? fromUnixTime(session.date.seconds)
          : new Date(session.date);
        
        if (!(sessionDate instanceof Date && !isNaN(sessionDate.valueOf()))) return;

        // KPI Calcs
        if (isAfter(sessionDate, startOfThisWeek)) activeThisWeek.add(student.id);
        if (isAfter(sessionDate, startOfLastWeek) && sessionDate <= endOfLastWeek) activeLastWeek.add(student.id);
        if (isSameDay(sessionDate, today)) solvedToday += session.questionsSolved;
        if (isSameDay(sessionDate, yesterday)) solvedYesterday += session.questionsSolved;

        totalCorrect += session.questionsCorrect;
        totalSolved += session.questionsSolved;

        // Agenda Calcs
        const group = student.className?.split('-')[0] || 'Diğer';
        if (!groupStats[group]) groupStats[group] = { correct: 0, solved: 0, students: new Set() };
        groupStats[group].correct += session.questionsCorrect;
        groupStats[group].solved += session.questionsSolved;
        groupStats[group].students.add(student.id);

        if (session.type !== 'topic') {
            const topicKey = `${session.subject} - ${session.topic}`;
            if (!topicStats[topicKey]) topicStats[topicKey] = { correct: 0, solved: 0 };
            topicStats[topicKey].correct += session.questionsCorrect;
            topicStats[topicKey].solved += session.questionsSolved;
        }
      });
    });

    // Attention Students Calcs
    const attentionStudents = {
        performanceDrop: [] as { name: string, className: string, change: number, id: string }[],
        inactive: [] as { name: string, className: string, lastActive: number, id: string }[],
    };

    students.forEach(student => {
        let solvedLast7 = 0, correctLast7 = 0;
        let solvedPrev7 = 0, correctPrev7 = 0;
        let lastActivityDay = -Infinity;

        (student.studySessions || []).forEach(session => {
            const sessionDate = session.date?.seconds ? fromUnixTime(session.date.seconds) : new Date(session.date);
            if (!(sessionDate instanceof Date && !isNaN(sessionDate.valueOf()))) return;
            const daysAgo = (today.getTime() - startOfDay(sessionDate).getTime()) / (1000 * 3600 * 24);
            if (daysAgo < 7) {
                solvedLast7 += session.questionsSolved;
                correctLast7 += session.questionsCorrect;
            } else if (daysAgo < 14) {
                solvedPrev7 += session.questionsSolved;
                correctPrev7 += session.questionsCorrect;
            }
            if (daysAgo > lastActivityDay) lastActivityDay = daysAgo;
        });

        if (lastActivityDay > 7 && lastActivityDay !== Infinity) {
            attentionStudents.inactive.push({ name: student.name, className: student.className || 'N/A', lastActive: Math.floor(lastActivityDay), id: student.id });
        }

        const accuracyLast7 = solvedLast7 > 10 ? (correctLast7 / solvedLast7) * 100 : -1;
        const accuracyPrev7 = solvedPrev7 > 10 ? (correctPrev7 / solvedPrev7) * 100 : -1;

        if (accuracyLast7 !== -1 && accuracyPrev7 !== -1) {
            const change = accuracyLast7 - accuracyPrev7;
            if (change < -10) { // 10% or more drop
                attentionStudents.performanceDrop.push({ name: student.name, className: student.className || 'N/A', change, id: student.id });
            }
        }
    });

    attentionStudents.performanceDrop.sort((a, b) => a.change - b.change);
    attentionStudents.inactive.sort((a, b) => b.lastActive - a.lastActive);
    
    // Agenda Calcs
    const groupPerformance = Object.entries(groupStats).map(([name, data]) => ({
        name,
        accuracy: data.solved > 0 ? (data.correct / data.solved) * 100 : 0
    })).filter(g => g.accuracy > 0);

    const mostSuccessfulGroup = groupPerformance.length > 0 ? groupPerformance.reduce((max, g) => g.accuracy > max.accuracy ? g : max) : null;
    const leastSuccessfulGroup = groupPerformance.length > 0 ? groupPerformance.reduce((min, g) => g.accuracy < min.accuracy ? g : min) : null;
    
    const challengingTopics = Object.entries(topicStats)
      .filter(([_, data]) => data.solved > 20) // at least 20 questions
      .map(([name, data]) => ({ name, accuracy: (data.correct / data.solved) * 100 }))
      .sort((a,b) => a.accuracy - b.accuracy);
      
    const mostChallengingTopic = challengingTopics.length > 0 ? challengingTopics[0] : null;

    return {
        activeStudents: { count: activeThisWeek.size, change: activeThisWeek.size - activeLastWeek.size },
        questionsToday: { count: solvedToday, change: solvedToday - solvedYesterday },
        overallAccuracy: { percentage: totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0 },
        attentionStudents,
        weeklyAgenda: {
            mostSuccessfulGroup,
            leastSuccessfulGroup,
            mostChallengingTopic,
        }
    };
  }, [students]);

  const KPICard = ({ title, value, change }: { title: string, value: string, change: number }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className={cn("flex items-center text-sm mt-1", change >= 0 ? "text-emerald-500" : "text-red-500")}>
            {change !== 0 && (change > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
            <span className="ml-1">
                {change > 0 && `+${change}`}
                {change < 0 && change}
                {change === 0 && 'Değişim Yok'}
            </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Yönetim Paneli
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Platformun genel durumu ve eyleme yönelik özetler." : "Sorumlu olduğunuz sınıflara genel bir bakış."}
          </p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard title="Aktif Öğrenci (Bu Hafta)" value={dashboardStats.activeStudents.count.toString()} change={dashboardStats.activeStudents.change} />
        <KPICard title="Çözülen Soru (Bugün)" value={dashboardStats.questionsToday.count.toLocaleString()} change={dashboardStats.questionsToday.count - dashboardStats.questionsToday.change} />
        <Card>
          <CardHeader><CardTitle className="text-base font-medium text-muted-foreground">Genel Başarı Ortalaması</CardTitle></CardHeader>
          <CardContent>
             <div className="text-3xl font-bold">{dashboardStats.overallAccuracy.percentage.toFixed(1)}%</div>
             <p className='text-sm mt-1 text-muted-foreground'>Tüm zamanların ortalaması</p>
          </CardContent>
        </Card>
      </div>

      {/* Action-Oriented Modules */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="text-amber-500" /> Dikkat Gerektiren Öğrenciler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2"><TrendingDown className="text-destructive"/> Performansı Düşenler</h4>
                {dashboardStats.attentionStudents.performanceDrop.length > 0 ? (
                    <ul className="space-y-2">
                        {dashboardStats.attentionStudents.performanceDrop.slice(0,3).map(s => (
                            <li key={s.id} className="text-sm flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                <span>{s.name} <span className="text-muted-foreground">({s.className})</span></span>
                                <span className='text-destructive font-medium'>{s.change.toFixed(0)}% düşüş</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">Kayda değer bir performans düşüşü yok. Harika!</p>}
            </div>
            <Separator />
             <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2"><XCircle className="text-destructive"/> Uzun Süredir Aktif Olmayanlar</h4>
                 {dashboardStats.attentionStudents.inactive.length > 0 ? (
                    <ul className="space-y-2">
                        {dashboardStats.attentionStudents.inactive.slice(0,3).map(s => (
                            <li key={s.id} className="text-sm flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                <span>{s.name} <span className="text-muted-foreground">({s.className})</span></span>
                                <span className='text-destructive font-medium'>{s.lastActive} gündür pasif</span>
                            </li>
                        ))}
                         {dashboardStats.attentionStudents.inactive.length > 3 && (
                            <p className='text-xs text-center text-muted-foreground mt-2'>...ve {dashboardStats.attentionStudents.inactive.length - 3} diğer öğrenci</p>
                        )}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">Herkes aktif görünüyor. Çok iyi!</p>}
            </div>
          </CardContent>
          <CardFooter>
             <Button variant="secondary" className="w-full" asChild><Link href="/admin/students">Tüm Öğrenci Listesini Görüntüle →</Link></Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Haftanın Gündemi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-4 p-3 bg-emerald-500/10 rounded-lg">
                <div className="p-2 bg-emerald-500/20 rounded-full"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
                <div>
                    <p className="text-sm text-muted-foreground">En Başarılı Grup</p>
                    {dashboardStats.weeklyAgenda.mostSuccessfulGroup ? (
                        <p className="font-bold text-lg">{dashboardStats.weeklyAgenda.mostSuccessfulGroup.name} <span className='text-emerald-600 font-semibold'>({dashboardStats.weeklyAgenda.mostSuccessfulGroup.accuracy.toFixed(1)}%)</span></p>
                    ) : <p className="text-sm text-muted-foreground">Veri yok.</p>}
                </div>
             </div>
             <div className="flex items-center gap-4 p-3 bg-red-500/10 rounded-lg">
                <div className="p-2 bg-red-500/20 rounded-full"><TrendingDown className="w-6 h-6 text-red-600" /></div>
                <div>
                    <p className="text-sm text-muted-foreground">Geliştirilmesi Gereken Grup</p>
                    {dashboardStats.weeklyAgenda.leastSuccessfulGroup ? (
                        <p className="font-bold text-lg">{dashboardStats.weeklyAgenda.leastSuccessfulGroup.name} <span className='text-red-600 font-semibold'>({dashboardStats.weeklyAgenda.leastSuccessfulGroup.accuracy.toFixed(1)}%)</span></p>
                    ) : <p className="text-sm text-muted-foreground">Veri yok.</p>}
                </div>
             </div>
              <div className="flex items-center gap-4 p-3 bg-blue-500/10 rounded-lg">
                <div className="p-2 bg-blue-500/20 rounded-full"><Book className="w-6 h-6 text-blue-600" /></div>
                <div>
                    <p className="text-sm text-muted-foreground">En Zorlanılan Konu</p>
                    {dashboardStats.weeklyAgenda.mostChallengingTopic ? (
                        <p className="font-bold text-lg">{dashboardStats.weeklyAgenda.mostChallengingTopic.name} <span className='text-blue-600 font-semibold'>({dashboardStats.weeklyAgenda.mostChallengingTopic.accuracy.toFixed(1)}%)</span></p>
                    ) : <p className="text-sm text-muted-foreground">Veri yok.</p>}
                </div>
             </div>
          </CardContent>
           <CardFooter>
             <Button variant="secondary" className="w-full" asChild><Link href="/admin/reports">Detaylı Raporları İncele →</Link></Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}


export default function AdminPage() {
    return (
        <AppLayout>
            <AdminPageContent />
        </AppLayout>
    )
}
