import { student } from '@/lib/mock-data';
import WelcomeHeader from '@/components/dashboard/welcome-header';
import WeeklyProgress from '@/components/dashboard/weekly-progress';
import StudySessionForm from '@/components/dashboard/study-session-form';
import AIFeedback from '@/components/dashboard/ai-feedback';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <WelcomeHeader name={student.name} />
      <Separator />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2 space-y-6">
          <WeeklyProgress
            studySessions={student.studySessions}
            weeklyGoal={student.weeklyQuestionGoal}
          />
          <AIFeedback
            studentName={student.name}
            studySessions={student.studySessions}
          />
        </div>
        <div className="lg:col-span-2">
          <StudySessionForm />
        </div>
      </div>
    </div>
  );
}
