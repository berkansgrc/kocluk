
import type { Student, AchievementDefinition } from './types';
import { Award, BarChart, Calendar, Target, Zap, Flame, BrainCircuit } from 'lucide-react';
import { differenceInCalendarDays, fromUnixTime, startOfDay } from 'date-fns';

const calculateStreak = (sessions: StudySession[]): number => {
  if (!sessions || sessions.length === 0) return 0;
  const sessionDates = sessions
    .map((s) =>
      s.date && typeof s.date.seconds === 'number'
        ? fromUnixTime(s.date.seconds)
        : new Date(s.date)
    )
    .filter((d) => d instanceof Date && !isNaN(d.valueOf()));
  const uniqueSessionDays = Array.from(
    new Set(sessionDates.map((date) => startOfDay(date).getTime()))
  )
    .map((time) => new Date(time))
    .sort((a, b) => b.getTime() - a.getTime());
  if (uniqueSessionDays.length === 0) return 0;
  const today = startOfDay(new Date());
  const lastSessionDay = uniqueSessionDays[0];
  if (differenceInCalendarDays(today, lastSessionDay) > 1) return 0;
  let currentStreak = 1;
  for (let i = 0; i < uniqueSessionDays.length - 1; i++) {
    const currentDay = uniqueSessionDays[i];
    const previousDay = uniqueSessionDays[i + 1];
    if (differenceInCalendarDays(currentDay, previousDay) === 1) {
      currentStreak++;
    } else {
      break;
    }
  }
  return currentStreak;
};


export const achievementChecks: { [key: string]: (student: Student) => boolean } = {
  'first-step': (student) => (student.studySessions || []).length > 0,
  'q-hunter-1': (student) => (student.studySessions || []).reduce((sum, s) => sum + s.questionsSolved, 0) >= 100,
  'q-hunter-2': (student) => (student.studySessions || []).reduce((sum, s) => sum + s.questionsSolved, 0) >= 500,
  'q-hunter-3': (student) => (student.studySessions || []).reduce((sum, s) => sum + s.questionsSolved, 0) >= 1000,
  'streak-3': (student) => calculateStreak(student.studySessions || []) >= 3,
  'streak-7': (student) => calculateStreak(student.studySessions || []) >= 7,
  'goal-champion': (student) => {
    const startOfWeekDate = startOfDay(new Date());
    startOfWeekDate.setDate(startOfWeekDate.getDate() - startOfWeekDate.getDay() + (startOfWeekDate.getDay() === 0 ? -6 : 1));
    const solvedThisWeek = (student.studySessions || [])
      .filter(s => {
          const sessionDate = s.date && typeof s.date.seconds === 'number' ? fromUnixTime(s.date.seconds) : new Date(s.date);
          return sessionDate >= startOfWeekDate;
      })
      .reduce((sum, s) => sum + s.questionsSolved, 0);
    return solvedThisWeek >= student.weeklyQuestionGoal;
  },
  'math-whiz': (student) => {
    const mathSessions = (student.studySessions || []).filter(s => s.subject === 'Matematik');
    if (mathSessions.length < 3) return false;
    const totalCorrect = mathSessions.reduce((sum, s) => sum + s.questionsCorrect, 0);
    const totalSolved = mathSessions.reduce((sum, s) => sum + s.questionsSolved, 0);
    return totalSolved > 0 && (totalCorrect / totalSolved) >= 0.9;
  }
};


export const allAchievements: AchievementDefinition[] = [
  { id: 'first-step', name: 'İlk Adım', description: 'İlk çalışma oturumunu tamamladın.', icon: Award },
  { id: 'q-hunter-1', name: 'Soru Avcısı I', description: 'Toplam 100 soru çözdün.', icon: BarChart },
  { id: 'q-hunter-2', name: 'Soru Avcısı II', description: 'Toplam 500 soru çözdün.', icon: BarChart },
  { id: 'q-hunter-3', name: 'Soru Avcısı III', description: 'Toplam 1000 soru çözdün.', icon: BarChart },
  { id: 'streak-3', name: '3 Günlük Seri', description: '3 gün art arda çalıştın.', icon: Flame },
  { id: 'streak-7', name: '7 Günlük Seri', description: '7 gün art arda çalıştın.', icon: Flame },
  { id: 'goal-champion', name: 'Hedef Şampiyonu', description: 'Haftalık soru hedefini tamamladın.', icon: Target },
  { id: 'math-whiz', name: 'Matematik Dehası', description: 'Matematik dersinde %90 genel başarıya ulaştın.', icon: BrainCircuit },
];
