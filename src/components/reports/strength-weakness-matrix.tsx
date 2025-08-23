'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { StudySession } from '@/lib/types';
import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface SubjectStats {
  subject: string;
  totalQuestions: number;
  totalMinutes: number;
  accuracy: number;
}

type SortKey = keyof Omit<SubjectStats, 'subject'>;

interface StrengthWeaknessMatrixProps {
  studySessions: StudySession[];
}

export default function StrengthWeaknessMatrix({ studySessions }: StrengthWeaknessMatrixProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'accuracy', direction: 'asc' });

  const subjectStats = useMemo(() => {
    const stats = studySessions.reduce((acc, session) => {
      if (!acc[session.subject]) {
        acc[session.subject] = {
          totalQuestions: 0,
          totalCorrect: 0,
          totalMinutes: 0,
        };
      }
      acc[session.subject].totalQuestions += session.questionsSolved;
      acc[session.subject].totalCorrect += session.questionsCorrect;
      acc[session.subject].totalMinutes += session.durationInMinutes;
      return acc;
    }, {} as Record<string, { totalQuestions: number; totalCorrect: number; totalMinutes: number }>);

    return Object.entries(stats).map(([subject, data]) => ({
      subject,
      totalQuestions: data.totalQuestions,
      totalMinutes: data.totalMinutes,
      accuracy: data.totalQuestions > 0 ? (data.totalCorrect / data.totalQuestions) * 100 : 0,
    }));
  }, [studySessions]);

  const sortedStats = useMemo(() => {
    if (!sortConfig) return subjectStats;
    return [...subjectStats].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [subjectStats, sortConfig]);
  
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ sortKey, label }: { sortKey: SortKey; label: string }) => (
    <TableHead className="text-right">
      <Button variant="ghost" onClick={() => requestSort(sortKey)}>
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ders Güçlü & Zayıf Yön Matrisi</CardTitle>
        <CardDescription>
          Farklı derslerdeki performansınızı analiz edin. Geliştirilecek alanları bulmak için doğruluğa göre sıralayın.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ders</TableHead>
                <SortableHeader sortKey="totalQuestions" label="Çözülen Soru" />
                <SortableHeader sortKey="totalMinutes" label="Harcanan Zaman (dk)" />
                <SortableHeader sortKey="accuracy" label="Doğruluk" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStats.map((stat) => (
                <TableRow key={stat.subject}>
                  <TableCell className="font-medium">{stat.subject}</TableCell>
                  <TableCell className="text-right">{stat.totalQuestions}</TableCell>
                  <TableCell className="text-right">{stat.totalMinutes}</TableCell>
                  <TableCell className="text-right">{stat.accuracy.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
