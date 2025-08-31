
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, fromUnixTime } from 'firebase/firestore';
import type { Student, StudySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function AdminReportsPageContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
    } catch (error) {
      console.error('Öğrenciler getirilirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Öğrenci verileri alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const reportData = useMemo(() => {
    if (students.length === 0) return null;

    let allSessions: StudySession[] = [];
    students.forEach(s => {
        if(s.studySessions) {
            allSessions.push(...s.studySessions);
        }
    });

    // Group success rate by class
    const classSuccess = students.reduce((acc, student) => {
        if (!student.className) return acc;
        const group = student.className.split('-')[0];
        const sessions = student.studySessions || [];
        const totalCorrect = sessions.reduce((sum, s) => sum + s.questionsCorrect, 0);
        const totalSolved = sessions.reduce((sum, s) => sum + s.questionsSolved, 0);
        
        if (!acc[group]) {
            acc[group] = { totalCorrect: 0, totalSolved: 0 };
        }
        acc[group].totalCorrect += totalCorrect;
        acc[group].totalSolved += totalSolved;
        return acc;
    }, {} as Record<string, { totalCorrect: number; totalSolved: number }>);
    
    const classSuccessData = Object.entries(classSuccess).map(([name, data]) => ({
        name,
        accuracy: data.totalSolved > 0 ? (data.totalCorrect / data.totalSolved) * 100 : 0
    })).sort((a,b) => b.accuracy - a.accuracy);


    // Subject duration distribution
    const subjectDuration = allSessions.reduce((acc, session) => {
        acc[session.subject] = (acc[session.subject] || 0) + session.durationInMinutes;
        return acc;
    }, {} as Record<string, number>);

    const subjectDurationData = Object.entries(subjectDuration).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    // Topic stats
    const topicStats = allSessions.reduce((acc, session) => {
      const key = `${session.subject} - ${session.topic}`;
      if (!acc[key]) {
        acc[key] = {
          totalQuestions: 0,
          totalCorrect: 0,
        };
      }
      acc[key].totalQuestions += session.questionsSolved;
      acc[key].totalCorrect += session.questionsCorrect;
      return acc;
    }, {} as Record<string, { totalQuestions: number; totalCorrect: number }>);

    const topicStatsData = Object.entries(topicStats).map(([name, data]) => ({
        name,
        accuracy: data.totalQuestions > 0 ? (data.totalCorrect / data.totalQuestions) * 100 : 0,
        totalQuestions: data.totalQuestions,
    }));
    
    const mostChallengingTopics = topicStatsData.filter(t => t.totalQuestions > 20).sort((a,b) => a.accuracy - b.accuracy).slice(0, 10);
    const easiestTopics = topicStatsData.filter(t => t.totalQuestions > 20).sort((a,b) => b.accuracy - a.accuracy).slice(0, 10);

    return { classSuccessData, subjectDurationData, mostChallengingTopics, easiestTopics };
  }, [students]);

  if (loading) {
     return <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className='h-8 w-64' />
        <div className='grid gap-6 grid-cols-1 lg:grid-cols-2 mt-4'>
            <Skeleton className='h-80 w-full' />
            <Skeleton className='h-80 w-full' />
        </div>
         <div className='grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6'>
            <Skeleton className='h-96 w-full' />
            <Skeleton className='h-96 w-full' />
        </div>
     </div>
  }

  if (!reportData) {
     return <div className="flex-1 p-4 md:p-8 pt-6">Veri bulunamadı.</div>
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Genel Raporlar</h1>
      
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Card>
            <CardHeader>
                <CardTitle>Sınıf Gruplarına Göre Başarı</CardTitle>
                <CardDescription>Platform genelinde sınıf gruplarının ortalama başarı oranları.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.classSuccessData} layout="vertical" margin={{ left: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
                        <Bar dataKey="accuracy" name="Başarı" radius={[0, 4, 4, 0]}>
                            {reportData.classSuccessData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Derslere Göre Zaman Dağılımı</CardTitle>
                <CardDescription>Öğrencilerin toplamda en çok hangi derslere zaman ayırdığı.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={reportData.subjectDurationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                             {reportData.subjectDurationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} dk`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

       <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
            <Card>
                <CardHeader>
                    <CardTitle>En Çok Zorlanılan Konular</CardTitle>
                    <CardDescription>Platform genelinde başarı oranı en düşük olan konular.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Konu</TableHead>
                                <TableHead className="text-right">Başarı Oranı</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.mostChallengingTopics.map(topic => (
                                <TableRow key={topic.name}>
                                    <TableCell className="font-medium">{topic.name}</TableCell>
                                    <TableCell className="text-right text-red-600 font-semibold">{topic.accuracy.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>En Başarılı Olunan Konular</CardTitle>
                    <CardDescription>Platform genelinde başarı oranı en yüksek olan konular.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Konu</TableHead>
                                <TableHead className="text-right">Başarı Oranı</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.easiestTopics.map(topic => (
                                <TableRow key={topic.name}>
                                    <TableCell className="font-medium">{topic.name}</TableCell>
                                    <TableCell className="text-right text-emerald-600 font-semibold">{topic.accuracy.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
       </div>

    </div>
  );
}

export default function AdminReportsPage() {
    return (
        <AppLayout>
            <AdminReportsPageContent />
        </AppLayout>
    )
}
