export interface StudySession {
  id: string;
  date: Date;
  subject: string;
  durationInMinutes: number;
  questionsSolved: number;
  questionsCorrect: number;
}

export interface Student {
  name: string;
  email: string;
  weeklyQuestionGoal: number;
  studySessions: StudySession[];
}
