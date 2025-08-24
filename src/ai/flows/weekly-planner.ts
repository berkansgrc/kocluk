'use server';

/**
 * @fileOverview AI tool to generate a weekly study plan for a student based on their performance.
 *
 * - generateWeeklyPlan - Analyzes a student's study sessions and creates a personalized weekly plan.
 * - WeeklyPlanInput - The input type for the generateWeeklyPlan function.
 * - WeeklyPlanOutput - The return type for the generateWeeklyPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { StudySession } from '@/lib/types';


const WeeklyPlanInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  studySessions: z.array(
    z.object({
      subject: z.string().describe('The subject of the study session.'),
      topic: z.string().describe('The topic of the study session.'),
      questionsSolved: z.number().describe('The number of questions solved.'),
      questionsCorrect: z.number().describe('The number of questions answered correctly.'),
      durationInMinutes: z.number().describe('The duration of the study session in minutes.'),
      accuracy: z.number().describe('The accuracy percentage for the session.'),
    })
  ).describe('An array of recent study sessions for the student.'),
   subjects: z.array(z.string()).describe("List of all available subjects to include in the plan.")
});
export type WeeklyPlanInput = z.infer<typeof WeeklyPlanInputSchema>;

const WeeklyPlanOutputSchema = z.object({
  plan: z.array(z.object({
    day: z.string().describe("Day of the week (e.g., Pazartesi, Salı)."),
    subject: z.string().describe("The subject to study."),
    topic: z.string().describe("The specific topic to focus on."),
    goal: z.string().describe("A concrete, actionable goal for the session (e.g., '45 dakika konu tekrarı yap ve 20 soru çöz.')."),
    reason: z.string().describe("A brief, encouraging reason in Turkish for why this specific task was assigned, based on their performance."),
  })).describe("A 7-day study plan, including one rest day.")
});
export type WeeklyPlanOutput = z.infer<typeof WeeklyPlanOutputSchema>;


export async function generateWeeklyPlan(input: WeeklyPlanInput): Promise<WeeklyPlanOutput> {
  return weeklyPlannerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weeklyPlannerPrompt',
  input: {schema: WeeklyPlanInputSchema},
  output: {schema: WeeklyPlanOutputSchema},
  prompt: `You are an expert academic coach creating a personalized 7-day study plan in Turkish for a student named {{studentName}}.

Analyze the student's past performance from their study sessions to identify strengths and weaknesses. The goal is to create a balanced weekly plan that reinforces weak areas without neglecting strong ones.

Student's recent study sessions:
{{#each studySessions}}
- Ders: {{subject}}, Konu: {{topic}}, Süre: {{durationInMinutes}}dk, Çözülen Soru: {{questionsSolved}}, Doğru Sayısı: {{questionsCorrect}} (Başarı: {{accuracy}}%)
{{/each}}

Available subjects to plan for: {{#each subjects}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Based on this data, create a 7-day study schedule.
- The plan must be in Turkish.
- For each day, specify the day name (Pazartesi, Salı, etc.).
- Assign a specific subject and topic for each study day.
- Provide a clear, actionable goal (e.g., "60 dakika boyunca konu tekrarı yap ve 15 test sorusu çöz").
- Include a brief, encouraging 'reason' for each assignment, explaining why it's important based on their data (e.g., "Bu konudaki başarı oranın düşük, temelini sağlamlaştırmak önemli." or "Bu konuyu tekrar ederek bilgilerini taze tutalım.").
- The plan should cover 5 to 6 study days. You MUST include at least one rest day ('Dinlenme Günü').
- If there is not enough data, create a balanced introductory plan covering different subjects from the available list. For the reason, state that it is a general plan to get started.

Return the 7-day plan in the format specified by the schema.`,
});

const weeklyPlannerFlow = ai.defineFlow(
  {
    name: 'weeklyPlannerFlow',
    inputSchema: WeeklyPlanInputSchema,
    outputSchema: WeeklyPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
