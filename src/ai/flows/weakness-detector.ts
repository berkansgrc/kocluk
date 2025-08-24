'use server';

/**
 * @fileOverview AI tool to analyze student accuracy and suggest areas for improvement.
 *
 * - weaknessDetector - Analyzes a student's study sessions and identifies areas for improvement.
 * - WeaknessDetectorInput - The input type for the weaknessDetector function.
 * - WeaknessDetectorOutput - The return type for the weaknessDetector function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WeaknessDetectorInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  studySessions: z.array(
    z.object({
      subject: z.string().describe('The subject of the study session.'),
      topic: z.string().describe('The topic of the study session.'),
      questionsSolved: z.number().describe('The number of questions solved.'),
      questionsCorrect: z.number().describe('The number of questions answered correctly.'),
    })
  ).describe('An array of study sessions for the student.'),
});
export type WeaknessDetectorInput = z.infer<typeof WeaknessDetectorInputSchema>;

const WeaknessDetectorOutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback on areas the student needs to focus on.'),
});
export type WeaknessDetectorOutput = z.infer<typeof WeaknessDetectorOutputSchema>;

export async function weaknessDetector(input: WeaknessDetectorInput): Promise<WeaknessDetectorOutput> {
  return weaknessDetectorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weaknessDetectorPrompt',
  input: {schema: WeaknessDetectorInputSchema},
  output: {schema: WeaknessDetectorOutputSchema},
  prompt: `You are an AI assistant designed to analyze a student's study sessions and provide personalized feedback in Turkish on areas they need to focus on to improve their overall performance.

  Analyze the following study sessions for {{studentName}}:

  {{#each studySessions}}
  - Ders: {{subject}}, Konu: {{topic}}, Çözülen Soru: {{questionsSolved}}, Doğru Sayısı: {{questionsCorrect}}
  {{/each}}

  Based on this data, provide specific and actionable feedback to the student in Turkish. Focus on identifying subjects and topics where the student's accuracy rate (questionsCorrect / questionsSolved) is low, and suggest strategies for improvement.
  If the student has no data, encourage the student to log their study sessions in Turkish.
  Ensure the feedback is encouraging and helpful.
  Return the output in the format specified by the schema description.`,
});

const weaknessDetectorFlow = ai.defineFlow(
  {
    name: 'weaknessDetectorFlow',
    inputSchema: WeaknessDetectorInputSchema,
    outputSchema: WeaknessDetectorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
