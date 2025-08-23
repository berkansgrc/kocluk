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
  subject: z.string().min(2, { message: 'Ders en az 2 karakter olmalıdır.' }),
  durationInMinutes: z.coerce.number().min(1, { message: 'Süre en az 1 dakika olmalıdır.' }),
  questionsSolved: z.coerce.number().min(0, { message: 'Negatif olamaz.' }),
  questionsCorrect: z.coerce.number().min(0, { message: 'Negatif olamaz.' }),
}).refine(data => data.questionsCorrect <= data.questionsSolved, {
  message: 'Doğru soru sayısı çözülen soru sayısını geçemez.',
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
    console.log('Yeni oturum kaydedildi:', values);
    toast({
      title: 'Oturum Kaydedildi!',
      description: `${values.subject} çalışma oturumunuz kaydedildi.`,
    });
    form.reset();
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Yeni Çalışma Oturumu Ekle</CardTitle>
        <CardDescription>
          İlerlemenizi takip etmek için pratiğinizi kaydedin.
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
                  <FormLabel>Ders</FormLabel>
                  <FormControl>
                    <Input placeholder="örn. Kalkülüs" {...field} />
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
                    <FormLabel>Süre (dk)</FormLabel>
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
                    <FormLabel>Çözülen</FormLabel>
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
                    <FormLabel>Doğru</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Oturumu Kaydet
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
