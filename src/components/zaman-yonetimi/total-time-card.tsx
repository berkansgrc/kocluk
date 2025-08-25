
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Hourglass } from 'lucide-react';

interface TotalTimeCardProps {
  totalMinutes: number;
}

export default function TotalTimeCard({ totalMinutes }: TotalTimeCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} saat ${remainingMinutes} dakika`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bugünkü Pomodoro Süresi</CardTitle>
        <CardDescription>
          Bu sayfada Pomodoro ile tamamladığınız toplam çalışma süresi.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center">
        <Hourglass className="w-12 h-12 text-primary mb-4" />
        <p className="text-3xl font-bold">{totalMinutes}</p>
        <p className="text-muted-foreground">Toplam Dakika</p>
        <p className="text-lg font-semibold mt-4">{formatDuration(totalMinutes)}</p>
      </CardContent>
    </Card>
  );
}
