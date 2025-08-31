
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Coffee, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Subject } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';

const WORK_MINS = 25;
const SHORT_BREAK_MINS = 5;
const LONG_BREAK_MINS = 15;
const GRADE_LEVELS = ["5", "6", "7", "8", "9", "10", "11", "12", "YKS"];

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroTimerProps {
  onWorkSessionComplete: () => void;
  studentId?: string;
  onSessionAdded: () => void;
}

export default function PomodoroTimer({ onWorkSessionComplete, studentId, onSessionAdded }: PomodoroTimerProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeRemaining, setTimeRemaining] = useState(WORK_MINS * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // State for subject/topic selection
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');


  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        const subjectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        setSubjects(subjectsList);
      } catch (error) {
        console.error("Dersler alınırken hata:", error);
        toast({ title: "Hata", description: "Ders listesi alınamadı.", variant: "destructive" });
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [toast]);
  
  const filteredSubjects = useMemo(() => subjects.filter(s => s.gradeLevel === selectedGradeLevel), [subjects, selectedGradeLevel]);
  const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);
  
  useEffect(() => {
    setSelectedSubjectId('');
    setSelectedTopicId('');
  }, [selectedGradeLevel]);

  useEffect(() => {
    setSelectedTopicId('');
  }, [selectedSubjectId]);

  const playSound = () => {
    audioRef.current?.play().catch(err => console.error("Audio play failed:", err));
  };

  const saveWorkSession = async () => {
    if (!studentId || !selectedSubjectId || !selectedTopicId) return;

    const subject = subjects.find(s => s.id === selectedSubjectId);
    const topic = subject?.topics.find(t => t.id === selectedTopicId);

    if (!subject || !topic) {
        toast({ title: 'Hata', description: 'Oturum kaydedilemedi, ders veya konu bulunamadı.', variant: 'destructive' });
        return;
    }

    const newSession = {
      id: new Date().toISOString(),
      date: Timestamp.now(),
      subject: subject.name,
      topic: topic.name,
      durationInMinutes: WORK_MINS,
      questionsSolved: 0,
      questionsCorrect: 0,
      type: 'topic' as const,
    };

    try {
        const studentDocRef = doc(db, 'students', studentId);
        await updateDoc(studentDocRef, {
            studySessions: arrayUnion(newSession)
        });
        toast({ title: 'Oturum Kaydedildi!', description: `${subject.name} - ${topic.name} çalışmanız başarıyla kaydedildi.` });
        onSessionAdded(); // Notify parent to refresh data if needed
    } catch(e) {
        console.error("Pomodoro session could not be saved:", e);
        toast({ title: 'Hata', description: 'Çalışma oturumu kaydedilirken bir hata oluştu.', variant: 'destructive' });
    }
  };

  const switchMode = useCallback((newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    switch (newMode) {
      case 'work':
        setTimeRemaining(WORK_MINS * 60);
        break;
      case 'shortBreak':
        setTimeRemaining(SHORT_BREAK_MINS * 60);
        break;
      case 'longBreak':
        setTimeRemaining(LONG_BREAK_MINS * 60);
        break;
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeRemaining === 0) {
      playSound();
      if (mode === 'work') {
        saveWorkSession();
        onWorkSessionComplete();
        const newSessionsCompleted = sessionsCompleted + 1;
        setSessionsCompleted(newSessionsCompleted);
        const nextMode = newSessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
        switchMode(nextMode);
         toast({ title: nextMode === 'longBreak' ? 'Uzun Mola Zamanı!' : 'Harika iş çıkardın, şimdi biraz dinlen.' });
      } else {
        switchMode('work');
        toast({ title: 'Çalışma Zamanı!', description: 'Mola bitti, hadi devam edelim!' });
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, mode, sessionsCompleted, switchMode, toast, onWorkSessionComplete]);

  const toggleTimer = () => setIsActive(prev => !prev);
  const resetTimer = () => switchMode(mode);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const modeDetails = {
    work: { title: 'Çalışma Zamanı', icon: <Book className="w-6 h-6" />, color: 'text-primary' },
    shortBreak: { title: 'Kısa Mola', icon: <Coffee className="w-6 h-6" />, color: 'text-emerald-500' },
    longBreak: { title: 'Uzun Mola', icon: <Coffee className="w-6 h-6" />, color: 'text-sky-500' },
  };

  const isStartDisabled = mode === 'work' && (!selectedGradeLevel || !selectedSubjectId || !selectedTopicId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pomodoro Zamanlayıcısı</CardTitle>
        <CardDescription>Odaklanmak için çalışma ve mola seanslarını kullan.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-6">
        <div className="flex space-x-2">
          <Button variant={mode === 'work' ? 'default' : 'outline'} onClick={() => switchMode('work')}>Çalışma</Button>
          <Button variant={mode === 'shortBreak' ? 'default' : 'outline'} onClick={() => switchMode('shortBreak')}>Kısa Mola</Button>
          <Button variant={mode === 'longBreak' ? 'default' : 'outline'} onClick={() => switchMode('longBreak')}>Uzun Mola</Button>
        </div>
        
        {mode === 'work' && (
          <div className='w-full max-w-lg p-4 border rounded-lg bg-muted/20 space-y-4'>
             <h4 className='text-sm font-medium text-center text-muted-foreground'>Bu seansta neye odaklanacaksın?</h4>
             {loadingSubjects ? <Skeleton className='h-10 w-full' /> : (
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <Select value={selectedGradeLevel} onValueChange={setSelectedGradeLevel}>
                  <SelectTrigger><SelectValue placeholder="Sınıf Seç" /></SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level === 'YKS' ? 'YKS' : `${level}. Sınıf`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedGradeLevel}>
                  <SelectTrigger><SelectValue placeholder={!selectedGradeLevel ? "Önce Sınıf Seç" : "Ders Seç"} /></SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={!selectedSubject}>
                  <SelectTrigger><SelectValue placeholder={!selectedSubject ? "Önce Ders Seç" : "Konu Seç"} /></SelectTrigger>
                  <SelectContent>
                    {selectedSubject?.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
             )}
          </div>
        )}

        <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                <circle className="text-muted/20" strokeWidth="7" cx="50" cy="50" r="45" fill="transparent" stroke="currentColor" />
                <circle
                    className={cn("transition-all duration-1000 ease-linear", modeDetails[mode].color)}
                    strokeWidth="7"
                    strokeLinecap="round"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="currentColor"
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={2 * Math.PI * 45 * (1 - timeRemaining / ((mode === 'work' ? WORK_MINS : mode === 'shortBreak' ? SHORT_BREAK_MINS : LONG_BREAK_MINS) * 60))}
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <div className="text-center">
                <div className={cn("text-6xl font-bold font-mono", modeDetails[mode].color)}>
                    {formatTime(timeRemaining)}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                    {modeDetails[mode].icon}
                    <p className="font-medium">{modeDetails[mode].title}</p>
                </div>
            </div>
        </div>

        <div className="flex space-x-4">
          <Button size="lg" onClick={toggleTimer} disabled={isStartDisabled}>
            {isActive ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isActive ? 'Duraklat' : 'Başlat'}
          </Button>
          <Button size="lg" variant="secondary" onClick={resetTimer}>
            <RotateCcw className="mr-2" />
            Sıfırla
          </Button>
        </div>
        
      </CardContent>
      <CardFooter className='flex-col items-center justify-center pt-4 border-t'>
         <p className="text-sm text-muted-foreground">Tamamlanan seans: {sessionsCompleted}</p>
         {isStartDisabled && <p className='text-xs text-destructive text-center mt-2'>Çalışma seansını başlatmak için lütfen sınıf, ders ve konu seçin.</p>}
      </CardFooter>
    </Card>
  );
}
