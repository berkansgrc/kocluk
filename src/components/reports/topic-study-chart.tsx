
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { StudySession } from '@/lib/types';
import { subDays, isAfter, fromUnixTime } from 'date-fns';

interface TopicStudyChartProps {
  studySessions: StudySession[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 border rounded-md bg-background/95 shadow-lg">
        <p className="font-bold text-sm mb-1">{label}</p>
        <p className="text-sm text-primary">
          Toplam Süre: <span className="font-semibold">{payload[0].value} dk</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TopicStudyChart({ studySessions }: TopicStudyChartProps) {
  const data = useMemo(() => {
    // Filter for topic study sessions within the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentSessions = studySessions.filter((session) => {
      if (session.type !== 'topic') return false;
      const sessionDate = session.date && typeof session.date.seconds === 'number'
        ? fromUnixTime(session.date.seconds)
        : new Date(session.date);
      return sessionDate instanceof Date && !isNaN(sessionDate.valueOf()) && isAfter(sessionDate, thirtyDaysAgo);
    });

    const durationByTopic = recentSessions.reduce((acc, session) => {
      const key = `${session.subject} - ${session.topic}`;
      acc[key] = (acc[key] || 0) + session.durationInMinutes;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(durationByTopic)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total) // Sort to show most studied topics
      .slice(0, 15); // Limit to top 15 topics to keep the chart readable
  }, [studySessions]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Konu Tekrarı Analizi</CardTitle>
          <CardDescription>Son 30 günde tekrar yapılan konuların süre dağılımı.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] w-full items-center justify-center">
            <p className="text-muted-foreground">Grafiği oluşturmak için konu tekrarı verisi yok.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konu Tekrarı Analizi</CardTitle>
        <CardDescription>Son 30 günde en çok tekrar edilen konular (süre bazında).</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" unit=" dk" stroke="hsl(var(--foreground))" />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--foreground))"
              fontSize={12}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
