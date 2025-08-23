'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { StudySession } from '@/lib/types';
import { useMemo } from 'react';
import { subDays, isAfter } from 'date-fns';

interface StudyDurationChartProps {
  studySessions: StudySession[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function StudyDurationChart({ studySessions }: StudyDurationChartProps) {
  const data = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentSessions = studySessions.filter((session) => isAfter(session.date, thirtyDaysAgo));
    
    const durationBySubject = recentSessions.reduce((acc, session) => {
      acc[session.subject] = (acc[session.subject] || 0) + session.durationInMinutes;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(durationBySubject)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [studySessions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaman Dağılımı</CardTitle>
        <CardDescription>Son 30 gün için derslere göre çalışma süresi.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              formatter={(value) => `${value} dk`}
            />
            <Legend verticalAlign="bottom" height={36} iconSize={10} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              paddingAngle={2}
              labelLine={false}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
