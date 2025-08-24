
'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { StudySession } from '@/lib/types';
import { startOfWeek, format, fromUnixTime } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PerformanceTrendChartProps {
  studySessions: StudySession[];
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
    return (
      <div className="p-2 border rounded-md bg-background/95 shadow-lg">
        <p className="font-bold text-sm mb-2">{label}</p>
        {payload.map((pld: any, index: number) => (
          <div key={index} style={{ color: pld.color }}>
            <span className="font-medium">{pld.name}: </span>
            <span className="font-semibold">{pld.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};


export default function PerformanceTrendChart({ studySessions }: PerformanceTrendChartProps) {
  const { data, subjects } = useMemo(() => {
    if (!studySessions || studySessions.length === 0) {
        return { data: [], subjects: [] };
    }

    const weeklyData: { [week: string]: { [subject: string]: { correct: number; total: number } } } = {};
    const allSubjects = new Set<string>();

    studySessions.forEach(session => {
        const sessionDate = session.date && typeof session.date.seconds === 'number'
          ? fromUnixTime(session.date.seconds)
          : new Date(session.date);

        if (!(sessionDate instanceof Date && !isNaN(sessionDate.valueOf()))) return;

        const weekStartDate = startOfWeek(sessionDate, { weekStartsOn: 1 });
        const weekKey = format(weekStartDate, 'dd MMM', { locale: tr });
        
        allSubjects.add(session.subject);

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {};
        }
        if (!weeklyData[weekKey][session.subject]) {
            weeklyData[weekKey][session.subject] = { correct: 0, total: 0 };
        }

        weeklyData[weekKey][session.subject].correct += session.questionsCorrect;
        weeklyData[weekKey][session.subject].total += session.questionsSolved;
    });

    const chartData = Object.keys(weeklyData).map(week => {
        const weekAccuracies: { [subject: string]: number | null } = {};
        allSubjects.forEach(subject => {
            const subjectData = weeklyData[week][subject];
            if (subjectData && subjectData.total > 0) {
                weekAccuracies[subject] = (subjectData.correct / subjectData.total) * 100;
            } else {
                 weekAccuracies[subject] = null; // Use null for missing data to create gaps in the line
            }
        });
        return { name: week, ...weekAccuracies };
    }).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Ensure chronological order


    return { data: chartData, subjects: Array.from(allSubjects) };
  }, [studySessions]);

   if (data.length < 2) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center">
        <p className="text-muted-foreground">Trend analizi için en az 2 haftalık veri gereklidir.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <LineChart 
        data={data}
        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
            tickFormatter={(value) => `%${value}`}
            domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '20px' }}
        />
        {subjects.map((subject, index) => (
          <Line
            key={subject}
            type="monotone"
            dataKey={subject}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls={false} // Creates gaps for weeks with no data
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
