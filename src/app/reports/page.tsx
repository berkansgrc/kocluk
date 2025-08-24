
'use client';

import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import PerformanceEffortMatrix from '@/components/reports/performance-effort-matrix';
import type { FeedbackNote } from '@/lib/types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type ReportContext = FeedbackNote['reportContext'];

const ReportCard: React.FC<{
  title: string;
  description: string;
  context: ReportContext;
  notes: FeedbackNote[];
  children: React.ReactNode;
}> = ({ title, description, context, notes, children }) => {
  const relevantNotes = notes.filter(n => n.reportContext === context);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {relevantNotes.length > 0 && (
        <CardFooter className='flex-col items-start gap-4 pt-4 border-t'>
          <h4 className='font-semibold text-sm'>Koçun Notları</h4>
          {relevantNotes.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()).map(note => (
            <div key={note.id} className='text-xs p-3 bg-amber-50 border border-amber-200 rounded-lg w-full'>
              <p className='text-muted-foreground mb-2'>
                {format(note.createdAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: tr })}
              </p>
              <p>{note.text}</p>
            </div>
          ))}
        </CardFooter>
      )}
    </Card>
  )
};


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
  const feedbackNotes = studentData.feedbackNotes || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Raporlarım
          </h1>
          <p className="text-muted-foreground">
            Performansınızı ve çalışma alışkanlıklarınızı analiz edin.
          </p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SolvedQuestionsChart studySessions={studySessions} />
        </div>
        <div className="lg:col-span-2">
          <StudyDurationChart studySessions={studySessions} />
        </div>
      </div>
      <div className="grid gap-6 mt-6">
        <ReportCard
          title="Konu Güçlü & Zayıf Yön Matrisi"
          description="Farklı derslerdeki ve konulardaki performansınızı analiz edin."
          context="StrengthWeaknessMatrix"
          notes={feedbackNotes}
        >
          <StrengthWeaknessMatrix studySessions={studySessions} />
        </ReportCard>

        <ReportCard
          title="Performans/Efor Matrisi"
          description="Konulara harcadığınız zaman ile o konudaki başarınızı karşılaştırın."
          context="PerformanceEffortMatrix"
          notes={feedbackNotes}
        >
          <PerformanceEffortMatrix studySessions={studySessions} />
        </ReportCard>
      </div>
    </div>
  );
}
