'use server';

/**
 * @fileOverview AI tool to generate study assignments for students.
 *
 * - generateAssignment - Creates a set of questions for a given subject and topic.
 * - GenerateAssignmentInput - The input type for the generateAssignment function.
 * - GenerateAssignmentOutput - The return type for the generateAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAssignmentInputSchema = z.object({
  subject: z.string().describe('The subject of the assignment (e.g., Matematik, Fizik).'),
  topic: z.string().describe('The specific topic for the assignment (e.g., Üslü Sayılar, Kaldırma Kuvveti).'),
  questionCount: z.number().int().min(1).max(20).describe('The number of questions to generate.'),
});
export type GenerateAssignmentInput = z.infer<typeof GenerateAssignmentInputSchema>;

const GenerateAssignmentOutputSchema = z.object({
  assignmentContent: z.string().describe('The generated assignment content, including questions and a separate answer key, formatted in Markdown.'),
});
export type GenerateAssignmentOutput = z.infer<typeof GenerateAssignmentOutputSchema>;


export async function generateAssignment(input: GenerateAssignmentInput): Promise<GenerateAssignmentOutput> {
  return generateAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'assignmentGeneratorPrompt',
  input: {schema: GenerateAssignmentInputSchema},
  output: {schema: GenerateAssignmentOutputSchema},
  prompt: `You are an expert teacher's assistant in Turkey. Your task is to create a study assignment for a student based on the provided parameters. The output must be in Turkish and formatted in Markdown.

  Instructions:
  1.  Generate {{questionCount}} questions for the subject '{{subject}}' on the topic '{{topic}}'.
  2.  The questions should be appropriate for a middle or high school student in Turkey.
  3.  The difficulty should be moderate.
  4.  Clearly label the questions (e.g., "Soru 1:", "Soru 2:").
  5.  After all the questions, create a separate section titled '### Cevap Anahtarı'.
  6.  List the answers to the questions under the 'Cevap Anahtarı' section.
  7.  The entire output must be a single string formatted in Markdown.

  Example Output Format:
  
  ### {{subject}}: {{topic}} Çalışma Kağıdı
  
  **Soru 1:** ...
  
  **Soru 2:** ...
  
  ...
  
  ---
  
  ### Cevap Anahtarı
  
  **1.** ...
  
  **2.** ...
  
  ...
  
  Return the entire assignment as a single string in the 'assignmentContent' field.`,
});

const generateAssignmentFlow = ai.defineFlow(
  {
    name: 'generateAssignmentFlow',
    inputSchema: GenerateAssignmentInputSchema,
    outputSchema: GenerateAssignmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
