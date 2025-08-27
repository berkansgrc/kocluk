

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
import { useEffect, useState, useMemo } from 'react';
import type { Subject } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const GRADE_LEVELS = ["5", "6", "7", "8", "9", "10", "11", "12", "YKS"];

const questionFormSchema = z.object({
  gradeLevel: z.string({ required_error: 'Lütfen bir sınıf seviyesi seçin.' }),
  subject: z.string({ required_error: 'Lütfen bir ders seçin.' }),
  topic: z.string({ required_error: 'Lütfen bir konu seçin.' }),
  durationInMinutes: z.coerce.number().min(1, { message: 'Süre en az 1 dakika olmalıdır.' }),
  questionsSolved: z.coerce.number().min(0, { message: 'Negatif olamaz.' }),
  questionsCorrect: z.coerce.number().min(0, { message: 'Negatif olamaz.' }),
}).refine(data => data.questionsCorrect <= data.questionsSolved, {
  message: 'Doğru soru sayısı çözülen soru sayısını geçemez.',
  path: ['questionsCorrect'],
});

const topicFormSchema = z.object({
  gradeLevel: z.string({ required_error: 'Lütfen bir sınıf seviyesi seçin.' }),
  subject: z.string({ required_error: 'Lütfen bir ders seçin.' }),
  topic: z.string({ required_error: 'Lütfen bir konu seçin.' }),
  durationInMinutes: z.coerce.number().min(1, { message: 'Süre en az 1 dakika olmalıdır.' }),
});

interface StudySessionFormProps {
  studentId: string;
  onSessionAdded: () => void;
}

export default function StudySessionForm({ studentId, onSessionAdded }: StudySessionFormProps) {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: { durationInMinutes: 0, questionsSolved: 0, questionsCorrect: 0 },
  });

  const topicForm = useForm<z.infer<typeof topicFormSchema>>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: { durationInMinutes: 0 },
  });

  const selectedGradeLevelQ = questionForm.watch('gradeLevel');
  const selectedSubjectIdQ = questionForm.watch('subject');
  
  const filteredSubjectsQ = useMemo(() => subjects.filter(s => s.gradeLevel === selectedGradeLevelQ), [subjects, selectedGradeLevelQ]);
  const selectedSubjectQ = useMemo(() => subjects.find(s => s.id === selectedSubjectIdQ), [subjects, selectedSubjectIdQ]);

  const selectedGradeLevelT = topicForm.watch('gradeLevel');
  const selectedSubjectIdT = topicForm.watch('subject');

  const filteredSubjectsT = useMemo(() => subjects.filter(s => s.gradeLevel === selectedGradeLevelT), [subjects, selectedGradeLevelT]);
  const selectedSubjectT = useMemo(() => subjects.find(s => s.id === selectedSubjectIdT), [subjects, selectedSubjectIdT]);


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
  
  useEffect(() => {
    questionForm.resetField('subject');
    questionForm.resetField('topic');
  }, [selectedGradeLevelQ, questionForm]);

  useEffect(() => {
    questionForm.resetField('topic');
  }, [selectedSubjectIdQ, questionForm]);

  useEffect(() => {
    topicForm.resetField('subject');
    topicForm.resetField('topic');
  }, [selectedGradeLevelT, topicForm]);

  useEffect(() => {
    topicForm.resetField('topic');
  }, [selectedSubjectIdT, topicForm]);


  async function onQuestionSubmit(values: z.infer<typeof questionFormSchema>) {
    const subjectName = subjects.find(s => s.id === values.subject)?.name || 'Bilinmeyen Ders';
    const topicName = subjects.find(s => s.id === values.subject)?.topics.find(t => t.id === values.topic)?.name || 'Bilinmeyen Konu';

    const newSession = {
      ...values,
      subject: subjectName,
      topic: topicName,
      id: new Date().toISOString(),
      date: Timestamp.now(),
      type: 'question' as const,
    };
    
    await saveSession(newSession);
    questionForm.reset({ gradeLevel: '', subject: '', topic: '', durationInMinutes: 0, questionsCorrect: 0, questionsSolved: 0 });
  }

  async function onTopicSubmit(values: z.infer<typeof topicFormSchema>) {
    const subjectName = subjects.find(s => s.id === values.subject)?.name || 'Bilinmeyen Ders';
    const topicName = subjects.find(s => s.id === values.subject)?.topics.find(t => t.id === values.topic)?.name || 'Bilinmeyen Konu';

    const newSession = {
      ...values,
      subject: subjectName,
      topic: topicName,
      id: new Date().toISOString(),
      date: Timestamp.now(),
      questionsSolved: 0,
      questionsCorrect: 0,
      type: 'topic' as const,
    };
    await saveSession(newSession);
    topicForm.reset({ gradeLevel: '', subject: '', topic: '', durationInMinutes: 0 });
  }
  
  async function saveSession(sessionData: any) {
     if (!studentId) {
       toast({ title: 'Hata', description: 'Oturum kaydedilemedi. Lütfen tekrar giriş yapın.', variant: 'destructive' });
      return;
    }
    try {
      const studentDocRef = doc(db, 'students', studentId);
      await updateDoc(studentDocRef, {
        studySessions: arrayUnion(sessionData)
      });
      toast({ title: 'Oturum Kaydedildi!', description: `${sessionData.subject} - ${sessionData.topic} çalışma oturumunuz kaydedildi.` });
      onSessionAdded();
    } catch (error) {
       console.error("Oturum kaydedilirken hata:", error);
       toast({ title: 'Hata', description: 'Oturumunuz kaydedilirken bir sorun oluştu.', variant: 'destructive' });
    }
  }


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Yeni Çalışma Oturumu Ekle</CardTitle>
        <CardDescription>İlerlemenizi takip etmek için pratiğinizi kaydedin.</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingSubjects ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
            <Tabs defaultValue="question" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="question">Soru Çözümü</TabsTrigger>
                    <TabsTrigger value="topic">Konu Tekrarı</TabsTrigger>
                </TabsList>
                <TabsContent value="question">
                    <Form {...questionForm}>
                        <form onSubmit={questionForm.handleSubmit(onQuestionSubmit)} className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={questionForm.control} name="gradeLevel" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Sınıf Seviyesi</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Bir seviye seçin" /></SelectTrigger></FormControl>
                                        <SelectContent>{GRADE_LEVELS.map(level => (<SelectItem key={level} value={level}>{level === 'YKS' ? 'YKS' : `${level}. Sınıf`}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={questionForm.control} name="subject" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Ders</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGradeLevelQ}>
                                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedGradeLevelQ ? "Önce seviye seçin" : "Bir ders seçin"} /></SelectTrigger></FormControl>
                                        <SelectContent>{filteredSubjectsQ.map(subject => (<SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField control={questionForm.control} name="topic" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Konu</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubjectQ}>
                                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedSubjectQ ? "Önce ders seçin" : "Bir konu seçin"} /></SelectTrigger></FormControl>
                                        <SelectContent>{selectedSubjectQ?.topics.map(topic => (<SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={questionForm.control} name="durationInMinutes" render={({ field }) => (<FormItem><FormLabel>Süre (dk)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={questionForm.control} name="questionsSolved" render={({ field }) => (<FormItem><FormLabel>Çözülen</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={questionForm.control} name="questionsCorrect" render={({ field }) => (<FormItem><FormLabel>Doğru</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                            <Button type="submit" className="w-full" disabled={questionForm.formState.isSubmitting}>
                                {questionForm.formState.isSubmitting ? 'Kaydediliyor...' : <><PlusCircle className="mr-2 h-4 w-4" /> Oturumu Kaydet</>}
                            </Button>
                        </form>
                    </Form>
                </TabsContent>
                <TabsContent value="topic">
                     <Form {...topicForm}>
                        <form onSubmit={topicForm.handleSubmit(onTopicSubmit)} className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={topicForm.control} name="gradeLevel" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Sınıf Seviyesi</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Bir seviye seçin" /></SelectTrigger></FormControl>
                                        <SelectContent>{GRADE_LEVELS.map(level => (<SelectItem key={level} value={level}>{level === 'YKS' ? 'YKS' : `${level}. Sınıf`}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={topicForm.control} name="subject" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Ders</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGradeLevelT}>
                                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedGradeLevelT ? "Önce seviye seçin" : "Bir ders seçin"} /></SelectTrigger></FormControl>
                                        <SelectContent>{filteredSubjectsT.map(subject => (<SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField control={topicForm.control} name="topic" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Konu</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubjectT}>
                                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedSubjectT ? "Önce ders seçin" : "Bir konu seçin"} /></SelectTrigger></FormControl>
                                        <SelectContent>{selectedSubjectT?.topics.map(topic => (<SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={topicForm.control} name="durationInMinutes" render={({ field }) => (<FormItem><FormLabel>Süre (dk)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <Button type="submit" className="w-full" disabled={topicForm.formState.isSubmitting}>
                                {topicForm.formState.isSubmitting ? 'Kaydediliyor...' : <><PlusCircle className="mr-2 h-4 w-4" /> Oturumu Kaydet</>}
                            </Button>
                        </form>
                    </Form>
                </TabsContent>
            </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
