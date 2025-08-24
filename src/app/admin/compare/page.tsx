
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, DocumentData } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ComparisonChart from '@/components/reports/comparison-chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const studentIds = searchParams.get('students')?.split(',') || [];

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    if (studentIds.length < 2) {
      toast({ title: "Hata", description: "Karşılaştırmak için en az 2 öğrenci seçilmelidir.", variant: "destructive" });
      router.push('/admin');
      return;
    }

    try {
      const studentPromises = studentIds.map(id => getDoc(doc(db, 'students', id)));
      const studentDocs = await Promise.all(studentPromises);
      
      const studentsData = studentDocs
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() } as Student));

      if (studentsData.length !== studentIds.length) {
          toast({ title: "Uyarı", description: "Bazı öğrenciler bulunamadı.", variant: "destructive"});
      }

      setStudents(studentsData);

    } catch (error) {
      console.error("Öğrenciler getirilirken hata:", error);
      toast({ title: "Hata", description: "Öğrenci verileri alınırken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [studentIds, router, toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  
  const overallStats = students.map(student => {
    const totalSolved = student.studySessions?.reduce((acc, s) => acc + s.questionsSolved, 0) || 0;
    const totalCorrect = student.studySessions?.reduce((acc, s) => acc + s.questionsCorrect, 0) || 0;
    const totalDuration = student.studySessions?.reduce((acc, s) => acc + s.durationInMinutes, 0) || 0;
    const accuracy = totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0;
    return {
      name: student.name,
      totalSolved,
      totalDuration,
      accuracy
    }
  });


  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
           <Skeleton className='h-7 w-48' />
           <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Separator />
        <Card>
            <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
         <Card>
            <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
            <CardContent><Skeleton className="h-96 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
           <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Admin Paneline Dön
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Öğrenci Karşılaştırma Raporu
          </h1>
          <p className="text-muted-foreground">
            Seçilen {students.length} öğrencinin performans metriklerini karşılaştırın.
          </p>
        </div>
        <Separator />

        <Card>
            <CardHeader>
                <CardTitle>Genel İstatistikler</CardTitle>
                <CardDescription>Öğrencilerin toplam performanslarının karşılaştırması.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Öğrenci</TableHead>
                            <TableHead className="text-right">Toplam Çözülen Soru</TableHead>
                            <TableHead className="text-right">Toplam Çalışma (dk)</TableHead>
                            <TableHead className="text-right">Genel Başarı</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {overallStats.map(stat => (
                            <TableRow key={stat.name}>
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell className="text-right">{stat.totalSolved}</TableCell>
                                <TableCell className="text-right">{stat.totalDuration}</TableCell>
                                <TableCell className="text-right">{stat.accuracy.toFixed(1)}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Derslere Göre Başarı Oranları</CardTitle>
                <CardDescription>Her öğrencinin farklı derslerdeki başarı yüzdelerini karşılaştırın.</CardDescription>
            </CardHeader>
            <CardContent>
                <ComparisonChart students={students} />
            </CardContent>
        </Card>

    </div>
  );
}

export default function ComparePage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <ComparePageContent />
        </Suspense>
    )
}

