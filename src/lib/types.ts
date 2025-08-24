


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
}

    