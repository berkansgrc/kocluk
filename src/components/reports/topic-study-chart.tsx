
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
  Cell,
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

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(262, 55%, 60%)',
  'hsl(310, 60%, 55%)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
     const data = payload[0].payload;
    return (
      <div className="p-2 border rounded-md bg-background/95 shadow-lg">
        <p className="font-bold text-sm">{data.topicName}</p>
        <p className="text-xs text-muted-foreground">{data.subject}</p>
        <p className="text-sm text-primary mt-1">
          Toplam Süre: <span className="font-semibold">{payload[0].value} dk</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TopicStudyChart({ studySessions }: TopicStudyChartProps) {
  const { data, subjectColorMap } = useMemo(() => {
    // Filter for topic study sessions within the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentSessions = studySessions.filter((session) => {
      if (session.type !== 'topic') return false;
      const sessionDate = session.date && typeof session.date.seconds === 'number'
        ? fromUnixTime(session.date.seconds)
        : new Date(session.date);
      return sessionDate instanceof Date && !isNaN(sessionDate.valueOf()) && isAfter(sessionDate, thirtyDaysAgo);
    });
    
    const uniqueSubjects = [...new Set(recentSessions.map(s => s.subject))];
    const subjectColorMap = uniqueSubjects.reduce((acc, subject, index) => {
        acc[subject] = COLORS[index % COLORS.length];
        return acc;
    }, {} as Record<string, string>);

    const durationByTopic = recentSessions.reduce((acc, session) => {
      const key = `${session.subject} - ${session.topic}`;
      if (!acc[key]) {
        acc[key] = { duration: 0, subject: session.subject, topicName: session.topic };
      }
      acc[key].duration += session.durationInMinutes;
      return acc;
    }, {} as Record<string, { duration: number; subject: string; topicName: string }>);

    const chartData = Object.entries(durationByTopic)
      .map(([key, value]) => ({
        name: key,
        total: value.duration,
        subject: value.subject,
        topicName: value.topicName,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

      return { data: chartData, subjectColorMap };
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
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="topicName"
              interval={0}
              tick={{ fontSize: 12, width: 100 }}
              angle={-45}
              textAnchor="end"
              stroke="hsl(var(--foreground))"
            />
            <YAxis
              unit=" dk"
              stroke="hsl(var(--foreground))"
              fontSize={12}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<CustomTooltip />}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={subjectColorMap[entry.subject] || COLORS[0]} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
