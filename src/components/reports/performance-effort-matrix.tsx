
'use client';

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
  CartesianGrid,
} from 'recharts';
import type { StudySession } from '@/lib/types';

interface PerformanceEffortMatrixProps {
  studySessions: StudySession[];
}

interface ChartData {
  topic: string;
  duration: number;
  accuracy: number;
  questions: number;
  quadrant: number;
}

const COLORS = {
  quadrant1: 'hsl(var(--chart-2))', // USTALIK ALANI (Önceki: Verimli Çalışma - Yeşil)
  quadrant2: 'hsl(var(--chart-1))',   // VERİMLİ ALAN (Önceki: Güçlü Alanlar - Mavi)
  quadrant3: 'hsl(var(--destructive))', // ÖNCELİKLİ TEKRAR ALANI (Kırmızı)
  quadrant4: 'hsl(var(--muted-foreground))', // YENİ BAŞLANGIÇ ALANI (Gri)
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 border rounded-md bg-background shadow-lg">
        <p className="font-bold">{data.topic}</p>
        <p>Süre: {data.duration.toFixed(0)} dk</p>
        <p>Doğruluk: {data.accuracy.toFixed(1)}%</p>
        <p>Soru Sayısı: {data.questions}</p>
      </div>
    );
  }
  return null;
};

export default function PerformanceEffortMatrix({ studySessions }: PerformanceEffortMatrixProps) {
  const { data, avgDuration, avgAccuracy } = useMemo(() => {
    const questionSessions = studySessions.filter(s => s.type !== 'topic');
    if (!questionSessions || questionSessions.length === 0) {
      return { data: [], avgDuration: 0, avgAccuracy: 0 };
    }

    const stats = questionSessions.reduce((acc, session) => {
      const key = `${session.subject} - ${session.topic}`;
      if (!acc[key]) {
        acc[key] = {
          topic: key,
          duration: 0,
          correct: 0,
          total: 0,
        };
      }
      acc[key].duration += session.durationInMinutes;
      acc[key].correct += session.questionsCorrect;
      acc[key].total += session.questionsSolved;
      return acc;
    }, {} as Record<string, { topic: string, duration: number; correct: number; total: number }>);

    const processedData = Object.values(stats)
      .filter((d) => d.total > 0)
      .map((d) => ({
        topic: d.topic,
        duration: d.duration,
        accuracy: (d.correct / d.total) * 100,
        questions: d.total,
        quadrant: 0, // Will be calculated later
      }));
      
    if (processedData.length === 0) {
      return { data: [], avgDuration: 0, avgAccuracy: 0 };
    }
      
    const totalDuration = processedData.reduce((sum, d) => sum + d.duration, 0);
    const totalAccuracyProducts = processedData.reduce((sum, d) => sum + d.accuracy * d.questions, 0);
    const totalQuestions = processedData.reduce((sum, d) => sum + d.questions, 0);
    
    const avgDuration = totalDuration / processedData.length;
    const avgAccuracy = totalQuestions > 0 ? totalAccuracyProducts / totalQuestions : 0;


    // Assign quadrant
    processedData.forEach(d => {
        if (d.duration >= avgDuration && d.accuracy >= avgAccuracy) d.quadrant = 1; // Sağ Üst: Ustalık
        else if (d.duration < avgDuration && d.accuracy >= avgAccuracy) d.quadrant = 2; // Sol Üst: Verimli
        else if (d.duration >= avgDuration && d.accuracy < avgAccuracy) d.quadrant = 3; // Sağ Alt: Öncelikli
        else d.quadrant = 4; // Sol Alt: Yeni Başlangıç
    });


    return { data: processedData, avgDuration, avgAccuracy };
  }, [studySessions]);

  if (data.length === 0) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center">
        <p className="text-muted-foreground">Grafiği oluşturmak için yeterli veri yok.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={500}>
        <ScatterChart
        margin={{
            top: 40,
            right: 40,
            bottom: 40,
            left: 20,
        }}
        >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
            type="number" 
            dataKey="duration" 
            name="Süre" 
            unit=" dk" 
            stroke="hsl(var(--foreground))"
            label={{ value: 'Harcanan Toplam Zaman (dk)', position: 'insideBottom', offset: -20, dy: 10 }}
        />
        <YAxis 
            type="number" 
            dataKey="accuracy" 
            name="Doğruluk" 
            unit="%" 
            domain={[0, 100]}
            stroke="hsl(var(--foreground))"
            label={{ value: 'Doğruluk Oranı (%)', angle: -90, position: 'insideLeft', dx: -10 }}
        />
        <ZAxis type="number" dataKey="questions" range={[100, 1000]} name="Soru Sayısı" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
        
        <ReferenceLine y={avgAccuracy} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <ReferenceLine x={avgDuration} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        
        <Label value="USTALIK ALANI" position="insideTopRight" offset={10} fill={COLORS.quadrant1} fontSize={12} fontWeight="bold" />
        <Label value="VERİMLİ ALAN" position="insideTopLeft" offset={10} fill={COLORS.quadrant2} fontSize={12} fontWeight="bold" />
        <Label value="ÖNCELİKLİ TEKRAR" position="insideBottomRight" offset={10} fill={COLORS.quadrant3} fontSize={12} fontWeight="bold" />
        <Label value="YENİ BAŞLANGIÇ" position="insideBottomLeft" offset={10} fill={COLORS.quadrant4} fontSize={12} fontWeight="bold" />

        <Scatter data={data} fill="hsl(var(--primary))">
            {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[`quadrant${entry.quadrant}` as keyof typeof COLORS]} />
            ))}
        </Scatter>
        </ScatterChart>
    </ResponsiveContainer>
  );
}
