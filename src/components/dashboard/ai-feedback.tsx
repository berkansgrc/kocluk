'use client';

import { useEffect, useState, useRef } from 'react';
import { weaknessDetector } from '@/ai/flows/weakness-detector';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Volume2, Loader2 } from 'lucide-react';
import type { StudySession } from '@/lib/types';
import type { WeaknessDetectorInput } from '@/ai/flows/weakness-detector';
import { Button } from '@/components/ui/button';

interface AIFeedbackProps {
  studentName: string;
  studySessions: StudySession[];
}

export default function AIFeedback({ studentName, studySessions }: AIFeedbackProps) {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);


  useEffect(() => {
    async function getFeedback() {
      setLoading(true);
      try {
        const input: WeaknessDetectorInput = {
          studentName,
          studySessions: studySessions.map(s => ({
            subject: s.subject,
            topic: s.topic || 'Genel', // Eski verilerde konu yoksa varsayılan ata
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

  const handleListen = async () => {
    if (!feedback || isGeneratingAudio) return;
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    try {
      const result = await textToSpeech(feedback);
      if (result.media) {
        setAudioUrl(result.media);
      }
    } catch (error) {
      console.error('Ses oluşturulurken hata oluştu:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };
  
  useEffect(() => {
    if(audioUrl && audioRef.current) {
        audioRef.current.play();
    }
  }, [audioUrl]);


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className='flex items-center gap-4'>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Yapay Zeka Zayıflık Tespiti</CardTitle>
              <CardDescription>
                Çalışmalarınıza yön vermek için kişiselleştirilmiş geri bildirim.
              </CardDescription>
            </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleListen} disabled={loading || isGeneratingAudio}>
          {isGeneratingAudio ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="mr-2 h-4 w-4" />
          )}
          Dinle
        </Button>
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
        {audioUrl && (
            <audio ref={audioRef} src={audioUrl} className='hidden' />
        )}
      </CardContent>
    </Card>
  );
}
