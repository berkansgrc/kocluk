'use client';

import { useEffect, useState } from 'react';
import { weaknessDetector } from '@/ai/flows/weakness-detector';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';
import type { StudySession } from '@/lib/types';
import type { WeaknessDetectorInput } from '@/ai/flows/weakness-detector';

interface AIFeedbackProps {
  studentName: string;
  studySessions: StudySession[];
}

export default function AIFeedback({ studentName, studySessions }: AIFeedbackProps) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getFeedback() {
      setLoading(true);
      try {
        const input: WeaknessDetectorInput = {
          studentName,
          studySessions: studySessions.map(s => ({
            subject: s.subject,
            topic: s.topic,
            questionsSolved: s.questionsSolved,
            questionsCorrect: s.questionsCorrect
          }))
        };
        const result = await weaknessDetector(input);
        setFeedback(result.feedback);
      } catch (error) {
        console.error('AI geri bildirim alınırken hata oluştu:', error);
        setFeedback('Şu anda geri bildirim yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }
    getFeedback();
  }, [studentName, studySessions]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Lightbulb className="w-6 h-6 text-primary" />
        </div>
        <div>
          <CardTitle>Yapay Zeka Zayıflık Tespiti</CardTitle>
          <CardDescription>
            Çalışmalarınıza yön vermek için kişiselleştirilmiş geri bildirim.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[60%]" />
            <Skeleton className="h-4 w-[70%]" />
          </div>
        ) : (
          <p className="text-sm text-foreground/80">{feedback}</p>
        )}
      </CardContent>
    </Card>
  );
}
