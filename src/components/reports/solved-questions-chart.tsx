'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { StudySession } from '@/lib/types';
import { useMemo } from 'react';
import { subDays, format, eachDayOfInterval, isSameDay } from 'date-fns';

interface SolvedQuestionsChartProps {
  studySessions: StudySession[];
}

export default function SolvedQuestionsChart({ studySessions }: SolvedQuestionsChartProps) {
  const data = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, 6);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return dateRange.map((date) => {
      const dailySessions = studySessions.filter((session) => isSameDay(session.date, date));
      const total = dailySessions.reduce((sum, session) => sum + session.questionsSolved, 0);
      return {
        name: format(date, 'EEE'),
        total: total,
      };
    });
  }, [studySessions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Solved Questions</CardTitle>
        <CardDescription>Total questions solved over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
