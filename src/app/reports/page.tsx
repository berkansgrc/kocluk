
'use client';

import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import PerformanceEffortMatrix from '@/components/reports/performance-effort-matrix';


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
          <SolvedQuestionsChart studySessions={studentData.studySessions || []} />
        </div>
        <div className="lg:col-span-2">
          <StudyDurationChart studySessions={studentData.studySessions || []} />
        </div>
      </div>
      <div className="grid gap-6 mt-6">
        <StrengthWeaknessMatrix studySessions={studentData.studySessions || []} />
        <PerformanceEffortMatrix studySessions={studentData.studySessions || []} />
      </div>
    </div>
  );
}

    