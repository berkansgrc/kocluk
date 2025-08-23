'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { StudySession } from '@/lib/types';
import { startOfWeek, isAfter } from 'date-fns';
import { useMemo } from 'react';

interface WeeklyProgressProps {
  studySessions: StudySession[];
  weeklyGoal: number;
}

export default function WeeklyProgress({
  studySessions,
  weeklyGoal,
}: WeeklyProgressProps) {
  const solvedThisWeek = useMemo(() => {
    const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    return studySessions
      .filter((session) => isAfter(session.date, startOfThisWeek))
      .reduce((total, session) => total + session.questionsSolved, 0);
  }, [studySessions]);

  const progressPercentage =
    weeklyGoal > 0 ? (solvedThisWeek / weeklyGoal) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Haftalık Hedef İlerlemesi</CardTitle>
        <CardDescription>
          Bu hafta {weeklyGoal} soruluk hedefinin {solvedThisWeek} tanesini çözdün.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progressPercentage} className="w-full" />
        <p className="text-sm text-muted-foreground mt-2">
          %{progressPercentage.toFixed(0)} tamamlandı
        </p>
      </CardContent>
    </Card>
  );
}
