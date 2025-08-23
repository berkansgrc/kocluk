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
        <CardTitle>Weekly Goal Progress</CardTitle>
        <CardDescription>
          You've solved {solvedThisWeek} out of your {weeklyGoal} question goal
          this week.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progressPercentage} className="w-full" />
        <p className="text-sm text-muted-foreground mt-2">
          {progressPercentage.toFixed(0)}% complete
        </p>
      </CardContent>
    </Card>
  );
}
