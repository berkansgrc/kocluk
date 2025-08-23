'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';

const formSchema = z.object({
  subject: z.string().min(2, { message: 'Subject must be at least 2 characters.' }),
  durationInMinutes: z.coerce.number().min(1, { message: 'Duration must be at least 1 minute.' }),
  questionsSolved: z.coerce.number().min(0, { message: 'Cannot be negative.' }),
  questionsCorrect: z.coerce.number().min(0, { message: 'Cannot be negative.' }),
}).refine(data => data.questionsCorrect <= data.questionsSolved, {
  message: 'Correct questions cannot exceed solved questions.',
  path: ['questionsCorrect'],
});

export default function StudySessionForm() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      durationInMinutes: 0,
      questionsSolved: 0,
      questionsCorrect: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('New session logged:', values);
    toast({
      title: 'Session Saved!',
      description: `Your ${values.subject} study session has been recorded.`,
    });
    form.reset();
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Add New Study Session</CardTitle>
        <CardDescription>
          Log your practice to track your progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Calculus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="durationInMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="questionsSolved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solved</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="questionsCorrect"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Save Session
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
