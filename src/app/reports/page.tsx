
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import PerformanceTrendChart from '@/components/reports/performance-trend-chart';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  add,
  format,
  fromUnixTime,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/app-layout';
import TopicStudyChart from '@/components/reports/topic-study-chart';

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'all';

function ReportsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchReportData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        setStudentData(studentDocSnap.data() as Student);
      } else {
        console.warn("No student data found for this user in Firestore.");
        setStudentData(null);
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

  const { filteredSessions, dateRangeDisplay } = useMemo(() => {
    if (!studentData || !studentData.studySessions) {
      return { filteredSessions: [], dateRangeDisplay: '' };
    }
  
    const allSessions = studentData.studySessions.map(s => {
      let sessionDate;
      if (s.date && typeof s.date.seconds === 'number') {
        sessionDate = fromUnixTime(s.date.seconds);
      } else {
        const parsedDate = new Date(s.date);
        sessionDate = !isNaN(parsedDate.getTime()) ? parsedDate : null;
      }
      return { ...s, date: sessionDate };
    }).filter(s => s.date instanceof Date);
  
    if (timeRange === 'all') {
      return { filteredSessions: allSessions, dateRangeDisplay: 'Tüm Zamanlar' };
    }
  
    let start: Date, end: Date;
    switch (timeRange) {
      case 'weekly':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'yearly':
        start = startOfYear(currentDate);
        end = endOfYear(currentDate);
        break;
      default:
        return { filteredSessions: allSessions, dateRangeDisplay: 'Tüm Zamanlar' };
    }
    
    const filtered = allSessions.filter(session => session.date && session.date >= start && session.date <= end);
  
    let display;
    if (timeRange === 'weekly') {
      display = `${format(start, 'd MMMM', { locale: tr })} - ${format(end, 'd MMMM yyyy', { locale: tr })}`;
    } else if (timeRange === 'monthly') {
      display = format(currentDate, 'MMMM yyyy', { locale: tr });
    } else { // yearly
      display = format(currentDate, 'yyyy', { locale: tr });
    }
  
    return { filteredSessions: filtered, dateRangeDisplay: display };
  }, [studentData, timeRange, currentDate]);

  const handleTimeNav = (direction: 'prev' | 'next') => {
    const amount = direction === 'prev' ? -1 : 1;
    let newDate;
    switch (timeRange) {
      case 'weekly':
        newDate = add(currentDate, { weeks: amount });
        break;
      case 'monthly':
        newDate = add(currentDate, { months: amount });
        break;
      case 'yearly':
        newDate = add(currentDate, { years: amount });
        break;
      default:
        return;
    }
    setCurrentDate(newDate);
  };

  if (loading || authLoading) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="grid gap-6 mt-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-96 w-full" />
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

      <div className='flex flex-col items-center gap-4 py-4'>
            <div className='flex items-center gap-2 flex-wrap justify-center'>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('weekly'); setCurrentDate(new Date()); }} className={cn(timeRange === 'weekly' && 'bg-accent')}>Haftalık</Button>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('monthly'); setCurrentDate(new Date()); }} className={cn(timeRange === 'monthly' && 'bg-accent')}>Aylık</Button>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('yearly'); setCurrentDate(new Date()); }} className={cn(timeRange === 'yearly' && 'bg-accent')}>Yıllık</Button>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('all'); setCurrentDate(new Date()); }} className={cn(timeRange === 'all' && 'bg-accent')}>Tümü</Button>
            </div>
            {timeRange !== 'all' && (
                <div className='flex items-center gap-4'>
                    <Button variant="ghost" size="icon" onClick={() => handleTimeNav('prev')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <p className='text-lg font-semibold text-center w-48 sm:w-64'>{dateRangeDisplay}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleTimeNav('next')}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            )}
       </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
        <SolvedQuestionsChart studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
        <StudyDurationChart studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
      </div>
      <div className="grid gap-6 mt-6">
        <TopicStudyChart studySessions={filteredSessions.filter(s => s.type === 'topic')} />
        <Card>
            <CardHeader>
              <CardTitle>Ders Performans Trendi</CardTitle>
              <CardDescription>Derslerdeki başarı oranının zaman içindeki değişimini inceleyin.</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTrendChart studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
            </CardContent>
          </Card>
        <Card>
          <CardHeader>
            <CardTitle>Konu Güçlü & Zayıf Yön Matrisi</CardTitle>
            <CardDescription>
              Farklı derslerdeki ve konulardaki performansınızı analiz edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StrengthWeaknessMatrix studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
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
            <PerformanceEffortMatrix studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReportsPage() {
    return (
        <AppLayout>
            <ReportsPageContent />
        </AppLayout>
    )
}
