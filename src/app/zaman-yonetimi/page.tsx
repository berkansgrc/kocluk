
'use client';

import { AppLayout } from '@/components/app-layout';
import PomodoroTimer from '@/components/zaman-yonetimi/pomodoro-timer';
import TotalTimeCard from '@/components/zaman-yonetimi/total-time-card';
import { Separator } from '@/components/ui/separator';

function ZamanYonetimiPageContent() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Zaman Yönetimi
          </h1>
          <p className="text-muted-foreground">
            Pomodoro tekniği ile verimliliğini artır ve çalışma süreni takip et.
          </p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mt-6">
        <div className="lg:col-span-2">
           <PomodoroTimer />
        </div>
        <div className="lg:col-span-1">
            <TotalTimeCard />
        </div>
      </div>
    </div>
  );
}


export default function ZamanYonetimiPage() {
    return (
        <AppLayout>
            <ZamanYonetimiPageContent />
        </AppLayout>
    )
}
