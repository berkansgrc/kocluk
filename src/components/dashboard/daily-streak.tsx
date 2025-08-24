'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Flame } from 'lucide-react';
import type { StudySession } from '@/lib/types';
import {
  isSameDay,
  subDays,
  fromUnixTime,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns';

interface DailyStreakProps {
  studySessions: StudySession[];
}

const calculateStreak = (sessions: StudySession[]): number => {
  if (!sessions || sessions.length === 0) {
    return 0;
  }

  // 1. Get unique days with sessions, converting Timestamps to Dates and filtering invalid dates
  const sessionDates = sessions
    .map((s) =>
      s.date && typeof s.date.seconds === 'number'
        ? fromUnixTime(s.date.seconds)
        : new Date(s.date)
    )
    .filter((d) => d instanceof Date && !isNaN(d.valueOf()));

  const uniqueSessionDays = Array.from(
    new Set(sessionDates.map((date) => startOfDay(date).getTime()))
  )
    .map((time) => new Date(time))
    .sort((a, b) => b.getTime() - a.getTime());

  if (uniqueSessionDays.length === 0) {
    return 0;
  }

  const today = startOfDay(new Date());
  const lastSessionDay = uniqueSessionDays[0];

  // 2. Check if the streak is current
  // It's not a current streak if the last session was before yesterday
  if (differenceInCalendarDays(today, lastSessionDay) > 1) {
    return 0;
  }

  // 3. Calculate the streak
  let currentStreak = 1;
  for (let i = 0; i < uniqueSessionDays.length - 1; i++) {
    const currentDay = uniqueSessionDays[i];
    const previousDay = uniqueSessionDays[i + 1];
    if (differenceInCalendarDays(currentDay, previousDay) === 1) {
      currentStreak++;
    } else {
      break; // Streak is broken
    }
  }

  return currentStreak;
};


export default function DailyStreak({ studySessions }: DailyStreakProps) {
    
  const streak = useMemo(() => calculateStreak(studySessions), [studySessions]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-2xl">
            <Flame className={`h-7 w-7 ${streak > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}/>
            {streak} Gün
        </CardTitle>
        <CardDescription>Günlük Çalışma Serisi</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {streak > 0 ? 'Harika gidiyorsun, seriyi devam ettir!' : 'Hadi bugün bir seri başlatalım!'}
        </p>
      </CardContent>
    </Card>
  );
}
