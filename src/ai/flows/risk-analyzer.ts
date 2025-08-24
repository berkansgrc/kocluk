'use server';

/**
 * @fileOverview AI tool to analyze student data and identify potential risks.
 * 
 * - riskAnalyzer - Analyzes student performance and identifies risks.
 * - RiskAnalyzerInput - The input type for the riskAnalyzer function.
 * - RiskAnalyzerOutput - The return type for the riskAnalyzer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { fromUnixTime, startOfWeek, isAfter } from 'date-fns';

const RiskAnalyzerInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  studySessions: z.array(
    z.object({
      subject: z.string().describe('The subject of the study session.'),
      topic: z.string().describe('The topic of the study session.'),
      questionsSolved: z.number().describe('The number of questions solved.'),
      questionsCorrect: z.number().describe('The number of questions answered correctly.'),
      durationInMinutes: z.number().describe('The duration of the study session in minutes.'),
      date: z.any().describe('The date of the study session.'),
    })
  ).describe('An array of study sessions for the student.'),
  weeklyGoal: z.number().describe('The student\'s weekly question goal.'),
});
export type RiskAnalyzerInput = z.infer<typeof RiskAnalyzerInputSchema>;

const RiskAnalyzerOutputSchema = z.object({
  risks: z.array(z.object({
    id: z.string().describe("A unique identifier for the risk type (e.g., 'ACCURACY_DROP', 'GOAL_MISS_RISK', 'INCONSISTENT_STUDY')."),
    severity: z.enum(['warning', 'critical']).describe("The severity of the risk."),
    description: z.string().describe("A concise, helpful, and encouraging description of the risk in Turkish, explaining what the risk is and what the student can do about it."),
  })).describe("A list of identified potential risks for the student."),
});
export type RiskAnalyzerOutput = z.infer<typeof RiskAnalyzerOutputSchema>;


export async function riskAnalyzer(input: RiskAnalyzerInput): Promise<RiskAnalyzerOutput> {
  // Pre-process data to add context for the AI
  const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const solvedThisWeek = input.studySessions
      .filter((session) => {
        const sessionDate = session.date && typeof session.date.seconds === 'number'
          ? fromUnixTime(session.date.seconds)
          : new Date(session.date);
        return sessionDate instanceof Date && !isNaN(sessionDate.valueOf()) && isAfter(sessionDate, startOfThisWeek)
      })
      .reduce((total, session) => total + session.questionsSolved, 0);

  const preProcessedInput = {
    ...input,
    context: {
        solvedThisWeek,
        progressPercentage: input.weeklyGoal > 0 ? (solvedThisWeek / input.weeklyGoal) * 100 : 0
    }
  }
  return riskAnalyzerFlow(preProcessedInput);
}

const prompt = ai.definePrompt({
  name: 'riskAnalyzerPrompt',
  input: {
    schema: z.object({
      ...RiskAnalyzerInputSchema.shape,
      context: z.object({
          solvedThisWeek: z.number(),
          progressPercentage: z.number(),
      })
    })
  },
  output: {schema: RiskAnalyzerOutputSchema},
  prompt: `You are an expert AI academic coach. Your task is to analyze the study data for a student named {{studentName}} and identify potential risks to their academic progress. Your feedback must be in Turkish.

  Current weekly goal: {{weeklyGoal}} questions.
  Solved this week so far: {{context.solvedThisWeek}} ({{context.progressPercentage}}% of goal).

  Study Sessions Data:
  {{#each studySessions}}
  - Ders: {{subject}}, Konu: {{topic}}, Süre: {{durationInMinutes}}dk, Çözülen: {{questionsSolved}}, Doğru: {{questionsCorrect}}
  {{/each}}

  Analyze the data and identify risks based on the following criteria. For each identified risk, provide a severity ('warning' or 'critical') and a concise, encouraging description in Turkish.

  1.  **GOAL_MISS_RISK (Hedefi Kaçırma Riski):** Check if the student is on track to meet their weekly goal. If the week is more than halfway through and they have completed less than 40% of their goal, this is a 'warning'. If they have completed less than 20%, it's 'critical'.
  2.  **ACCURACY_DROP (Başarı Düşüşü):** Identify any specific subject or topic where the accuracy (correct/solved) is consistently below 60%. This is a 'warning'. If it's below 40%, it's 'critical'.
  3.  **INEFFICIENT_STUDY (Verimsiz Çalışma):** Find topics where the student spent a lot of time (e.g., more than 90 minutes total) but their accuracy is still low (e.g., below 65%). This is a 'warning'.
  4.  **INCONSISTENT_STUDY (Düzensiz Çalışma):** If there are no study sessions recorded in the last 3-4 days, identify this as a 'warning' to encourage consistency.

  Do not generate a risk if the conditions are not met. The output should be a list of identified risks in the specified JSON format. If there are no risks, return an empty list.`,
});

const riskAnalyzerFlow = ai.defineFlow(
  {
    name: 'riskAnalyzerFlow',
    inputSchema: z.any(),
    outputSchema: RiskAnalyzerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
