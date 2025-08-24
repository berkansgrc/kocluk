
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
  topic: string;
  durationInMinutes: number;
  questionsSolved: number;
  questionsCorrect: number;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  link: string;
  type: 'note' | 'exercise' | 'video';
}

export interface Student {
  id: string;
  name: string;
  email: string;
  className?: string;
  weeklyQuestionGoal: number;
  studySessions: StudySession[];
  assignments?: Assignment[];
  resources?: Resource[];
}

    