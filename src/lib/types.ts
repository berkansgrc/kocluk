export interface StudySession {
  id: string;
  date: any; // Allow Firestore Timestamp
  subject: string;
  durationInMinutes: number;
  questionsSolved: number;
  questionsCorrect: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  weeklyQuestionGoal: number;
  studySessions: StudySession[];
}