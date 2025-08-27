

export interface Assignment {
  id: string;
  driveLink: string; 
  assignedAt: any; // Firestore Timestamp
  title: string;
  isNew?: boolean;
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

export interface Topic {
  id:string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  gradeLevel: string;
  topics: Topic[];
}

export interface WeeklyPlanItem {
    day: string;
    subject: string;
    topic: string;
    goal: string;
    reason: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

export interface AppUser {
    uid: string;
    email: string;
    role: 'admin' | 'student';
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
  weeklyPlan?: WeeklyPlanItem[];
  isPlanNew?: boolean;
  unlockedAchievements?: string[];
}

export interface ExamTopicResult {
  topic: string;
  correct: number;
  incorrect: number;
  empty: number;
}

export interface ExamAnalysis {
  overallSuccessRate: number;
  overallNet: number;
  strengths: string[];
  weaknesses: {
    topic: string;
    suggestion: string;
  }[];
  generalFeedback: string;
}

export const ERROR_CATEGORIES = {
  knowledgeGap: "Bilgi Eksikliği",
  carelessness: "Dikkatsizlik / İşlem Hatası",
  misunderstanding: "Soruyu Yanlış Anlama",
  timePressure: "Süre Yetersizliği",
  distractor: "İki Şık Arasında Kalma",
} as const;

export type ErrorCategory = keyof typeof ERROR_CATEGORIES;

export interface ExamResult extends ExamAnalysis {
    id?: string;
    userId: string;
    examName: string;
    subjectName: string;
    gradeLevel: string;
    analyzedAt: any; // Firestore Timestamp
    topicResults: ExamTopicResult[];
    errorAnalysis: Record<ErrorCategory, number>;
}
