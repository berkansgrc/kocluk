
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { Student } from '@/lib/types';

interface ComparisonChartProps {
  students: Student[];
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
      <div className="p-2 border rounded-md bg-background shadow-lg text-sm">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toFixed(1)}%`}
          </div>
        ))}
      </div>
    );
  }
  return null;
};


export default function ComparisonChart({ students }: ComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!students || students.length === 0) {
      return [];
    }
  
    // 1. Get all unique subjects from all selected students
    const allSubjects = new Set<string>();
    students.forEach(student => {
      student.studySessions?.forEach(session => {
        allSubjects.add(session.subject);
      });
    });
  
    // 2. For each subject, calculate accuracy for each student
    const data = Array.from(allSubjects).map(subject => {
      const subjectData: { name: string, [key: string]: string | number } = { name: subject };
  
      students.forEach(student => {
        const relevantSessions = student.studySessions?.filter(s => s.subject === subject) || [];
        const totalSolved = relevantSessions.reduce((acc, s) => acc + s.questionsSolved, 0);
        const totalCorrect = relevantSessions.reduce((acc, s) => acc + s.questionsCorrect, 0);
        const accuracy = totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0;
        subjectData[student.name] = accuracy;
      });
  
      return subjectData;
    });
  
    return data;
  }, [students]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center">
        <p className="text-muted-foreground">Karşılaştırma için yeterli veri bulunmuyor.</p>
      </div>
    );
  }
  

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} />
        <YAxis stroke="hsl(var(--foreground))" fontSize={12} unit="%" domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {students.map((student, index) => (
          <Bar 
            key={student.id} 
            dataKey={student.name} 
            fill={COLORS[index % COLORS.length]} 
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
