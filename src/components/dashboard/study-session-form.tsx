
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
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, Timestamp, collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Subject } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  subject: z.string({ required_error: 'Lütfen bir ders seçin.' }),
  topic: z.string({ required_error: 'Lütfen bir konu seçin.' }),
  durationInMinutes: z.coerce.number().min(1, { message: 'Süre en az 1 dakika olmalıdır.' }),
  questionsSolved: z.coerce.number().min(0, { message: 'Negatif olamaz.' }),
  questionsCorrect: z.coerce.number().min(0, { message: 'Negatif olamaz.' }),
}).refine(data => data.questionsCorrect <= data.questionsSolved, {
  message: 'Doğru soru sayısı çözülen soru sayısını geçemez.',
  path: ['questionsCorrect'],
});

interface StudySessionFormProps {
  studentId: string;
  onSessionAdded: () => void;
}

export default function StudySessionForm({ studentId, onSessionAdded }: StudySessionFormProps) {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      durationInMinutes: 0,
      questionsSolved: 0,
      questionsCorrect: 0,
    },
  });

  const selectedSubjectId = form.watch('subject');
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        const subjectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        setSubjects(subjectsList);
      } catch (error) {
        console.error("Dersler alınırken hata:", error);
        toast({ title: "Hata", description: "Ders listesi alınamadı.", variant: "destructive" });
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [toast]);
  
  // Reset topic when subject changes
  useEffect(() => {
    form.resetField('topic');
  }, [selectedSubjectId, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!studentId) {
       toast({
        title: 'Hata',
        description: 'Oturum kaydedilemedi. Lütfen tekrar giriş yapın.',
        variant: 'destructive',
      });
      return;
    }
    
    const subjectName = subjects.find(s => s.id === values.subject)?.name || 'Bilinmeyen Ders';
    const topicName = subjects.find(s => s.id === values.subject)?.topics.find(t => t.id === values.topic)?.name || 'Bilinmeyen Konu';


    const newSession = {
      ...values,
      subject: subjectName,
      topic: topicName,
      id: new Date().toISOString(),
      date: Timestamp.now(),
    };
    
    try {
      const studentDocRef = doc(db, 'students', studentId);
      await updateDoc(studentDocRef, {
        studySessions: arrayUnion(newSession)
      });

      toast({
        title: 'Oturum Kaydedildi!',
        description: `${subjectName} - ${topicName} çalışma oturumunuz kaydedildi.`,
      });
      form.reset({
        subject: '',
        topic: '',
        durationInMinutes: 0,
        questionsCorrect: 0,
        questionsSolved: 0,
      });
      onSessionAdded(); // Notify parent to re-fetch data
    } catch (error) {
       console.error("Oturum kaydedilirken hata:", error);
       toast({
        title: 'Hata',
        description: 'Oturumunuz kaydedilirken bir sorun oluştu.',
        variant: 'destructive',
      });
    }
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
        {loadingSubjects ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ders</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Bir ders seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map(subject => (
                            <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konu</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubject}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedSubject ? "Önce ders seçin" : "Bir konu seçin"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedSubject?.topics.map(topic => (
                             <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Kaydediliyor...' : <><PlusCircle className="mr-2 h-4 w-4" /> Oturumu Kaydet</>}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
