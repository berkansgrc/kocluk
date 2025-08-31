
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { StudySession } from '@/lib/types';
import { useMemo } from 'react';
import { subDays, format, eachDayOfInterval, isSameDay, fromUnixTime } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SolvedQuestionsChartProps {
  studySessions: StudySession[];
  dailyGoal?: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, entry: any) => acc + entry.value, 0);
    return (
      <div className="p-2 border rounded-md bg-background/95 shadow-lg">
        <p className="font-bold text-sm mb-2">{label}</p>
        {payload.map((pld: any, index: number) => (
          <div key={index} style={{ color: pld.color }}>
            <span className="font-medium">{pld.name}: </span>
            <span className="font-semibold">{pld.value} soru</span>
          </div>
        ))}
         {payload.length > 1 && (
            <>
            <hr className='my-1 border-border' />
            <p className='font-bold text-sm'>Toplam: {total} soru</p>
            </>
        )}
      </div>
    );
  }
  return null;
};


export default function SolvedQuestionsChart({ studySessions, dailyGoal }: SolvedQuestionsChartProps) {
  const { data, subjects } = useMemo(() => {
    const questionSessions = studySessions.filter(s => s.type !== 'topic');
    const endDate = new Date();
    const startDate = subDays(endDate, 6);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const allSubjects = [...new Set(questionSessions.map(s => s.subject))];

    const chartData = dateRange.map((date) => {
      const dailySessions = questionSessions.filter((session) => {
        const sessionDate = session.date && typeof session.date.seconds === 'number'
          ? fromUnixTime(session.date.seconds)
          : new Date(session.date);
        return sessionDate instanceof Date && !isNaN(sessionDate.valueOf()) && isSameDay(sessionDate, date);
      });

      const dailyData: { [key: string]: any } = {
        name: format(date, 'EEE', { locale: tr }),
      };
      
      allSubjects.forEach(subject => {
        dailyData[subject] = 0;
      });

      dailySessions.forEach(session => {
        dailyData[session.subject] = (dailyData[session.subject] || 0) + session.questionsSolved;
      });
      
      return dailyData;
    });
    return { data: chartData, subjects: allSubjects };
  }, [studySessions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Günlük Çözülen Sorular</CardTitle>
        <CardDescription>Son 7 gündeki ders bazında soru dağılımınız.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
              content={<CustomTooltip />}
            />
            <Legend wrapperStyle={{paddingTop: '20px'}} />
            
            {dailyGoal && dailyGoal > 0 && (
                <ReferenceLine 
                    y={dailyGoal} 
                    label={{ value: 'Hedef', position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    stroke="hsl(var(--accent))" 
                    strokeDasharray="3 3" 
                />
            )}

            {subjects.map((subject, index) => (
                <Bar 
                    key={subject} 
                    dataKey={subject} 
                    stackId="a" 
                    fill={COLORS[index % COLORS.length]} 
                    name={subject}
                    radius={[4, 4, 0, 0]}
                />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
