

export interface CalendarEvent {
    id: string;
    date: string; // YYYY-MM-DD format
    title: string;
    author: 'student' | 'admin';
    createdAt: any; // Firestore Timestamp
}

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
  type?: 'question' | 'topic';
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
    id: string;
    day: string;
    subject: string;
    topic: string;
    goal: string;
    isCompleted: boolean;
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
  calendarEvents?: CalendarEvent[];
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
