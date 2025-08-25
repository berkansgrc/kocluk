
'use client';

/**
 * @fileOverview AI tool to analyze trial exam results and provide detailed feedback.
 * 
 * - analyzeExam - Analyzes topic-based exam results for a specific subject.
 * - ExamAnalyzerInput - The input type for the analyzeExam function.
 * - ExamAnalyzerOutput - The return type for the analyzeExam function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExamAnalyzerInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  examName: z.string().describe("The name of the trial exam (e.g., 'TYT Genel Deneme 3')."),
  subjectName: z.string().describe("The subject of the exam being analyzed (e.g., 'Matematik')."),
  topicResults: z.array( // This field is named "topic" for historical reasons but now represents "kazanım" (learning objective)
    z.object({
      topic: z.string().describe('The name of the learning objective (kazanım).'),
      correct: z.number().int().describe('Number of correct answers for the objective.'),
      incorrect: z.number().int().describe('Number of incorrect answers for the objective.'),
      empty: z.number().int().describe('Number of empty answers for the objective.'),
    })
  ).describe('An array of results for each learning objective (kazanım) in the exam.'),
});
export type ExamAnalyzerInput = z.infer<typeof ExamAnalyzerInputSchema>;

const ExamAnalyzerOutputSchema = z.object({
    overallNet: z.number().describe("The student's total net score for this subject in the exam."),
    overallSuccessRate: z.number().describe("The student's overall success percentage (Net / Total Questions * 100)."),
    strengths: z.array(z.string()).describe("A list of learning objectives (kazanımlar) where the student performed well (success rate > 75%)."),
    weaknesses: z.array(z.object({
        topic: z.string().describe("The name of a learning objective that needs improvement."),
        suggestion: z.string().describe("A specific, actionable study suggestion in Turkish for this weakness."),
    })).describe("The top 3 learning objectives the student should focus on, with targeted advice for each."),
    generalFeedback: z.string().describe("Overall encouraging feedback in Turkish, summarizing the performance and suggesting a general strategy."),
});
export type ExamAnalyzerOutput = z.infer<typeof ExamAnalyzerOutputSchema>;

export async function analyzeExam(input: ExamAnalyzerInput): Promise<ExamAnalyzerOutput> {
  // Pre-process data to calculate net and success rate for each topic (kazanım)
  const processedTopics = input.topicResults.map(topic => {
    const totalQuestions = topic.correct + topic.incorrect + topic.empty;
    const net = topic.correct - (topic.incorrect / 4);
    const successRate = totalQuestions > 0 ? (net / totalQuestions) * 100 : 0;
    return { ...topic, net, successRate };
  });

  const preProcessedInput = {
    ...input,
    topicResults: processedTopics,
  };

  return examAnalyzerFlow(preProcessedInput);
}

const prompt = ai.definePrompt({
  name: 'examAnalyzerPrompt',
  input: {
    schema: z.object({
      ...ExamAnalyzerInputSchema.shape,
      topicResults: z.array( // "topic" here refers to a "kazanım"
        z.object({
          topic: z.string(),
          correct: z.number(),
          incorrect: z.number(),
          empty: z.number(),
          net: z.number(),
          successRate: z.number(),
        })
      ),
    }),
  },
  output: { schema: ExamAnalyzerOutputSchema },
  prompt: `You are an expert academic coach analyzing a trial exam for a student. Your feedback must be in Turkish. The analysis is based on "kazanım" (learning objectives), not broad topics.

  Student: {{studentName}}
  Exam: {{examName}}
  Subject: {{subjectName}}

  Learning Objective (Kazanım) Results:
  {{#each topicResults}}
  - Kazanım: {{topic}}, Doğru: {{correct}}, Yanlış: {{incorrect}}, Boş: {{empty}}, Net: {{net}}, Başarı: %{{successRate}}
  {{/each}}

  Your task is to analyze these results and provide structured feedback.

  1.  **Calculate Overall Stats:** First, calculate the total net score and the overall success rate ( (Total Net / Total Questions) * 100 ).
  2.  **Identify Strengths:** List learning objectives (kazanımlar) with a success rate over 75% as strengths. If there are no clear strengths, mention that it's a good baseline to build upon.
  3.  **Identify Top 3 Weaknesses:** Find the 3 learning objectives with the lowest success rates (must be below 70%). These are the priority areas. For each of these 3 objectives, provide a specific and actionable study suggestion in Turkish. For example, for 'Tam sayıların pozitif tam sayı kuvvetlerini hesaplar.', suggest 'Bu kazanıma yönelik olarak EBA veya benzeri bir platformdan kısa bir konu tekrar videosu izleyip, ardından 15-20 tane bu kazanıma özel soru çözerek pekiştir.'
  4.  **Provide General Feedback:** Write a concise, encouraging paragraph summarizing the student's performance. Acknowledge their effort, mention the identified strengths and weaknesses, and provide a forward-looking strategy (e.g., 'Bu hafta özellikle zayıf olarak belirlenen 3 kazanıma odaklanarak netlerini önemli ölçüde artırabilirsin. Bu kazanımlara yönelik nokta atışı çalışmalar yapmak genel konu tekrarlarından daha verimli olacaktır.').

  Return the complete analysis in the specified JSON format. Ensure the 'topic' field in the output 'weaknesses' array contains the full name of the learning objective.`,
});

const examAnalyzerFlow = ai.defineFlow(
  {
    name: 'examAnalyzerFlow',
    inputSchema: z.any(), // Input is pre-processed
    outputSchema: ExamAnalyzerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

    