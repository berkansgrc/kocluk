import { student } from '@/lib/mock-data';
import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Separator } from '@/components/ui/separator';

export default function ReportsPage() {
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
          <SolvedQuestionsChart studySessions={student.studySessions} />
        </div>
        <div className="lg:col-span-2">
          <StudyDurationChart studySessions={student.studySessions} />
        </div>
      </div>
      <div>
        <StrengthWeaknessMatrix studySessions={student.studySessions} />
      </div>
    </div>
  );
}
