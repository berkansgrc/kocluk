
'use server';

/**
 * @fileOverview AI tool to analyze a student's categorized mistakes and provide actionable feedback.
 * 
 * - analyzeMistakes - Analyzes categorized mistakes and generates feedback.
 * - MistakeAnalyzerInput - The input type for the analyzeMistakes function.
 * - MistakeAnalyzerOutput - The return type for the analyzeMistakes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ERROR_CATEGORIES, type ErrorCategory } from '@/lib/types';

const MistakeAnalyzerInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  errorAnalysis: z.record(z.nativeEnum(Object.keys(ERROR_CATEGORIES) as [ErrorCategory, ...ErrorCategory[]]), z.number())
    .describe("An object where keys are error categories and values are the count of mistakes in that category."),
});
export type MistakeAnalyzerInput = z.infer<typeof MistakeAnalyzerInputSchema>;

const MistakeAnalyzerOutputSchema = z.object({
  feedback: z.string().describe("Personalized, actionable feedback in Turkish based on the error distribution. The feedback should directly address the most frequent error types and suggest concrete improvement strategies."),
});
export type MistakeAnalyzerOutput = z.infer<typeof MistakeAnalyzerOutputSchema>;

export async function analyzeMistakes(input: MistakeAnalyzerInput): Promise<MistakeAnalyzerOutput> {
  const formattedInput = {
      ...input,
      errorAnalysisFormatted: Object.entries(input.errorAnalysis)
                                  .map(([key, value]) => `- ${ERROR_CATEGORIES[key as ErrorCategory]}: ${value} hata`)
                                  .join('\n')
  }
  return mistakeAnalyzerFlow(formattedInput);
}

const prompt = ai.definePrompt({
  name: 'mistakeAnalyzerPrompt',
  input: { schema: z.object({
      studentName: z.string(),
      errorAnalysisFormatted: z.string(),
  }) },
  output: { schema: MistakeAnalyzerOutputSchema },
  prompt: `You are an expert academic coach. Your task is to analyze a student's self-reported mistake categories from their latest exam and provide a concise, encouraging, and highly actionable feedback in Turkish.

  Student: {{studentName}}

  Mistake Distribution:
  {{errorAnalysisFormatted}}

  Your Task:
  1.  Identify the dominant mistake category (or top two if they are close).
  2.  Write a personalized feedback paragraph directly addressing this.
  3.  DO NOT just list the numbers. INTERPRET them.
  4.  Provide specific, concrete strategies the student can implement immediately.

  Example Feedback (if 'Bilgi Eksikliği' is dominant):
  "Merhaba {{studentName}}, analizine göre hatalarının büyük bir kısmı 'Bilgi Eksikliği'nden kaynaklanıyor. Bu, konuların temeline inmenin ne kadar önemli olduğunu gösteriyor. Önümüzdeki hafta özellikle zorlandığın 2-3 konuyu belirleyip, bu konulara ait kısa konu anlatım videoları izlemeni ve ardından sadece o konuya odaklanan 20-25 soruluk bir test çözmeni öneririm. Bu, eksiklerini en hızlı şekilde kapatmanı sağlayacaktır."

  Example Feedback (if 'Dikkatsizlik' is dominant):
  "{{studentName}}, harika haber! Analizine göre hatalarının çoğu konu eksiğinden değil, 'Dikkatsizlik ve İşlem Hataları'ndan geliyor. Bu demek oluyor ki konulara hakimsin! Bu sorunu çözmek için soruları çözerken daha yavaş ve dikkatli ilerlemeyi deneyebilirsin. Özellikle soru kökünün altını çizmek ve sonuca ulaştıktan sonra işlemini hızlıca bir kez daha kontrol etmek, netlerini anında artırabilir. Ayrıca, süre tutarak test çözme alıştırmaları yapmak da dikkatini daha iyi yönetmene yardımcı olacaktır."

  Return only the feedback paragraph in the specified JSON format.`,
});

const mistakeAnalyzerFlow = ai.defineFlow(
  {
    name: 'mistakeAnalyzerFlow',
    inputSchema: z.any(),
    outputSchema: MistakeAnalyzerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
