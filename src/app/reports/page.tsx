
'use client';

import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import PerformanceEffortMatrix from '@/components/reports/performance-effort-matrix';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
  const { studentData, loading } = useAuth();

  if (loading || !studentData) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
           <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-3">
             <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-2">
             <Skeleton className="h-96 w-full" />
          </div>
        </div>
        <div className="grid gap-6 mt-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }
  
  const studySessions = studentData.studySessions || [];
  const weeklyPlan = studentData.weeklyPlan || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Raporlarım
          </h1>
          <p className="text-muted-foreground">
            Performansını, çalışma alışkanlıklarını ve haftalık planını analiz et.
          </p>
        </div>
      </div>
      <Separator />

      {weeklyPlan.length > 0 && (
        <div className="mt-6">
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
                                {weeklyPlan.map((item) => (
                                    <TableRow key={item.day}>
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


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-6">
        <div className="lg:col-span-3">
          <SolvedQuestionsChart studySessions={studySessions} />
        </div>
        <div className="lg:col-span-2">
          <StudyDurationChart studySessions={studySessions} />
        </div>
      </div>
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Konu Güçlü & Zayıf Yön Matrisi</CardTitle>
            <CardDescription>
              Farklı derslerdeki ve konulardaki performansınızı analiz edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StrengthWeaknessMatrix studySessions={studySessions} />
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
            <PerformanceEffortMatrix studySessions={studySessions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
