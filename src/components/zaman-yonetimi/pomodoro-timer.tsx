
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Coffee, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const WORK_MINS = 25;
const SHORT_BREAK_MINS = 5;
const LONG_BREAK_MINS = 15;

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export default function PomodoroTimer() {
  const { toast } = useToast();
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeRemaining, setTimeRemaining] = useState(WORK_MINS * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

   useEffect(() => {
    // Audio'yu sadece client tarafında yükle
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, []);

  const playSound = () => {
    audioRef.current?.play().catch(err => console.error("Audio play failed:", err));
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
        const newSessionsCompleted = sessionsCompleted + 1;
        setSessionsCompleted(newSessionsCompleted);
        const nextMode = newSessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
        switchMode(nextMode);
         toast({ title: nextMode === 'longBreak' ? 'Uzun Mola Zamanı!' : 'Kısa Mola Zamanı!', description: 'Harika iş çıkardın, şimdi biraz dinlen.' });
      } else {
        switchMode('work');
        toast({ title: 'Çalışma Zamanı!', description: 'Mola bitti, hadi devam edelim!' });
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, mode, sessionsCompleted, switchMode, toast]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pomodoro Zamanlayıcısı</CardTitle>
        <CardDescription>Odaklanmak için çalışma ve mola seanslarını kullan.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-8">
        <div className="flex space-x-2">
          <Button variant={mode === 'work' ? 'default' : 'outline'} onClick={() => switchMode('work')}>Çalışma</Button>
          <Button variant={mode === 'shortBreak' ? 'default' : 'outline'} onClick={() => switchMode('shortBreak')}>Kısa Mola</Button>
          <Button variant={mode === 'longBreak' ? 'default' : 'outline'} onClick={() => switchMode('longBreak')}>Uzun Mola</Button>
        </div>
        
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
          <Button size="lg" onClick={toggleTimer}>
            {isActive ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isActive ? 'Duraklat' : 'Başlat'}
          </Button>
          <Button size="lg" variant="secondary" onClick={resetTimer}>
            <RotateCcw className="mr-2" />
            Sıfırla
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Tamamlanan seans: {sessionsCompleted}</p>
      </CardContent>
    </Card>
  );
}
