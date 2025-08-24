export interface Assignment {
  id: string;
  driveLink: string;
  assignedAt: any; // Firestore Timestamp
  title: string;
}

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
  assignments?: Assignment[];
}
