'use client';

import { useAuth } from '@/hooks/use-auth';
import WelcomeHeader from '@/components/dashboard/welcome-header';
import WeeklyProgress from '@/components/dashboard/weekly-progress';
import StudySessionForm from '@/components/dashboard/study-session-form';
import AIFeedback from '@/components/dashboard/ai-feedback';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import AssignmentsList from '@/components/dashboard/assignments-list';

export default function DashboardPage() {
  const { user, studentData, loading, isAdmin } = useAuth();

  if (loading || (!studentData && !isAdmin)) {
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Adminler için özel bir karşılama ekranı gösterilebilir.
  if (isAdmin) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <WelcomeHeader name="Admin" />
        <Separator />
        <p>Admin paneline hoş geldiniz. Öğrencileri ve uygulama ayarlarını yönetmek için lütfen Admin Paneli sayfasını ziyaret edin.</p>
      </div>
    );
  }

  // Öğrenci verisi mevcutsa öğrenci dashboard'ını göster
  if (studentData) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <WelcomeHeader name={studentData.name} />
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 space-y-6">
            <WeeklyProgress
              studySessions={studentData.studySessions || []}
              weeklyGoal={studentData.weeklyQuestionGoal}
            />
            <AIFeedback
              studentName={studentData.name}
              studySessions={studentData.studySessions || []}
            />
             <AssignmentsList assignments={studentData.assignments || []} />
          </div>
          <div className="lg:col-span-2">
            <StudySessionForm studentId={studentData.id} />
          </div>
        </div>
      </div>
    );
  }

  // Bu duruma normalde gelinmemeli, ancak bir fallback olarak eklendi.
  return <div className="p-8">Yükleniyor veya kullanıcı verisi bulunamadı...</div>;
}
