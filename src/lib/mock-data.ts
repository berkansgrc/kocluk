import type { Student } from './types';
import { subDays } from 'date-fns';

const sessions = [
  // Last 7 days
  { id: '1', date: subDays(new Date(), 1), subject: 'Calculus', durationInMinutes: 60, questionsSolved: 20, questionsCorrect: 15 },
  { id: '2', date: subDays(new Date(), 2), subject: 'Trigonometry', durationInMinutes: 45, questionsSolved: 15, questionsCorrect: 12 },
  { id: '3', date: subDays(new Date(), 3), subject: 'Calculus', durationInMinutes: 75, questionsSolved: 25, questionsCorrect: 22 },
  { id: '4', date: subDays(new Date(), 4), subject: 'Algebra', durationInMinutes: 50, questionsSolved: 30, questionsCorrect: 20 },
  { id: '5', date: subDays(new Date(), 5), subject: 'Geometry', durationInMinutes: 40, questionsSolved: 10, questionsCorrect: 9 },
  { id: '6', date: subDays(new Date(), 6), subject: 'Calculus', durationInMinutes: 90, questionsSolved: 30, questionsCorrect: 25 },
  
  // Last 30 days
  { id: '7', date: subDays(new Date(), 8), subject: 'Algebra', durationInMinutes: 60, questionsSolved: 25, questionsCorrect: 23 },
  { id: '8', date: subDays(new Date(), 10), subject: 'Trigonometry', durationInMinutes: 55, questionsSolved: 18, questionsCorrect: 13 },
  { id: '9', date: subDays(new Date(), 12), subject: 'Geometry', durationInMinutes: 30, questionsSolved: 12, questionsCorrect: 12 },
  { id: '10', date: subDays(new Date(), 15), subject: 'Calculus', durationInMinutes: 120, questionsSolved: 40, questionsCorrect: 33 },
  { id: '11', date: subDays(new Date(), 18), subject: 'Algebra', durationInMinutes: 45, questionsSolved: 22, questionsCorrect: 18 },
  { id: '12', date: subDays(new Date(), 20), subject: 'Trigonometry', durationInMinutes: 60, questionsSolved: 20, questionsCorrect: 10 },
  { id: '13', date: subDays(new Date(), 22), subject: 'Statistics', durationInMinutes: 70, questionsSolved: 25, questionsCorrect: 24 },
  { id: '14', date: subDays(new Date(), 25), subject: 'Calculus', durationInMinutes: 80, questionsSolved: 28, questionsCorrect: 20 },
  { id: '15', date: subDays(new Date(), 28), subject: 'Geometry', durationInMinutes: 50, questionsSolved: 15, questionsCorrect: 11 },
  { id: '16', date: subDays(new Date(), 29), subject: 'Statistics', durationInMinutes: 60, questionsSolved: 20, questionsCorrect: 19 },
];

export const student: Student = {
  name: 'Alex',
  email: 'alex@example.com',
  weeklyQuestionGoal: 100,
  studySessions: sessions,
};
