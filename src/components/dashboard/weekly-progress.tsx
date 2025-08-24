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
import { startOfWeek, isAfter, fromUnixTime } from 'date-fns';
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
      .filter((session) => {
        // Handle both Timestamp and Date objects for flexibility
        const sessionDate = session.date && typeof session.date.seconds === 'number'
          ? fromUnixTime(session.date.seconds)
          : new Date(session.date); // Fallback for string or other date formats
        return sessionDate instanceof Date && !isNaN(sessionDate.valueOf()) && isAfter(sessionDate, startOfThisWeek)
      })
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
