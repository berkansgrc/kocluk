
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import type { Subject, Topic } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Library, PlusCircle, Trash2, Pencil, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const GRADE_LEVELS = ["5", "6", "7", "8", "9", "10", "11", "12", "YKS"];

const subjectFormSchema = z.object({
  name: z.string().min(2, { message: 'Ders adı en az 2 karakter olmalıdır.' }),
  gradeLevel: z.string({ required_error: 'Lütfen bir sınıf seviyesi seçin.' }),
});

const topicFormSchema = z.object({
  name: z.string().min(2, { message: 'Konu adı en az 2 karakter olmalıdır.' }),
});


export default function LibraryPage() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const subjectForm = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: '' },
  });
  
  const editSubjectForm = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
  });

  const topicForm = useForm<z.infer<typeof topicFormSchema>>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: { name: '' },
  });

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Subject)).sort((a, b) => a.name.localeCompare(b.name));
      setSubjects(subjectsList);
    } catch (error) {
      console.error('Dersler getirilirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Ders listesi alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const groupedSubjects = useMemo(() => {
    return GRADE_LEVELS.map(grade => ({
      grade,
      subjects: subjects.filter(s => s.gradeLevel === grade),
    }));
  }, [subjects]);


  async function onSubjectSubmit(values: z.infer<typeof subjectFormSchema>) {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'subjects'), {
        name: values.name,
        gradeLevel: values.gradeLevel,
        topics: [],
      });
      toast({
        title: 'Başarılı!',
        description: `${values.name} dersi ${values.gradeLevel}. sınıf seviyesine eklendi.`,
      });
      subjectForm.reset();
      await fetchSubjects();
    } catch (error) {
      console.error('Ders eklenirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Ders eklenirken bir sorun oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubject(values: z.infer<typeof subjectFormSchema>) {
    if (!editingSubject) return;
    try {
      const subjectDocRef = doc(db, 'subjects', editingSubject.id);
      await updateDoc(subjectDocRef, { 
        name: values.name,
        gradeLevel: values.gradeLevel,
       });
      toast({ title: 'Başarılı!', description: 'Ders güncellendi.' });
      setEditingSubject(null);
      await fetchSubjects();
    } catch (error) {
        console.error("Ders güncellenirken hata:", error);
        toast({ title: 'Hata', description: 'Ders güncellenirken bir sorun oluştu.', variant: 'destructive' });
    }
  }

  async function handleDeleteSubject(subjectId: string) {
    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
      toast({ title: 'Başarılı!', description: 'Ders silindi.' });
      await fetchSubjects();
    } catch (error) {
        console.error("Ders silinirken hata:", error);
        toast({ title: 'Hata', description: 'Ders silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  }

  async function onTopicSubmit(subjectId: string, values: z.infer<typeof topicFormSchema>) {
      setIsSubmitting(true)
      const newTopic: Topic = {
          id: new Date().toISOString(),
          name: values.name
      }
      try {
        const subjectDocRef = doc(db, 'subjects', subjectId);
        await updateDoc(subjectDocRef, {
            topics: arrayUnion(newTopic)
        });
        toast({ title: 'Başarılı!', description: 'Konu eklendi.' });
        topicForm.reset();
        await fetchSubjects();
      } catch (error) {
         console.error("Konu eklenirken hata:", error);
         toast({ title: 'Hata', description: 'Konu eklenirken bir sorun oluştu.', variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  }
  
  async function handleTopicDelete(subjectId: string, topic: Topic) {
      try {
        const subjectDocRef = doc(db, 'subjects', subjectId);
        await updateDoc(subjectDocRef, {
            topics: arrayRemove(topic)
        });
        toast({ title: 'Başarılı!', description: 'Konu silindi.' });
        await fetchSubjects();
      } catch (error) {
          console.error("Konu silinirken hata:", error);
          toast({ title: 'Hata', description: 'Konu silinirken bir sorun oluştu.', variant: 'destructive' });
      }
  }


  if (loading) {
      return (
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className='h-6 w-48' />
                </CardHeader>
                <CardContent className='flex items-start gap-4'>
                    <div className='flex-1 space-y-2'>
                        <Skeleton className='h-5 w-32' />
                        <Skeleton className='h-10 w-full' />
                    </div>
                     <div className='flex-1 space-y-2'>
                        <Skeleton className='h-5 w-32' />
                        <Skeleton className='h-10 w-full' />
                    </div>
                    <div className='self-end'>
                        <Skeleton className='h-10 w-28' />
                    </div>
                </CardContent>
            </Card>
            <div className='space-y-8 mt-6'>
                <Skeleton className='h-8 w-40' />
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    <Skeleton className='h-72 w-full' />
                    <Skeleton className='h-72 w-full' />
                    <Skeleton className='h-72 w-full' />
                </div>
                 <Skeleton className='h-8 w-40' />
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    <Skeleton className='h-72 w-full' />
                </div>
            </div>
          </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Ders & Konu Kütüphanesi
        </h1>
        <p className="text-muted-foreground">
          Sistemdeki dersleri ve bu derslere ait konuları sınıf seviyesine göre yönetin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni Ders Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="flex items-start gap-4">
              <FormField
                  control={subjectForm.control}
                  name="gradeLevel"
                  render={({ field }) => (
                    <FormItem className="w-1/4">
                      <FormLabel>Sınıf Seviyesi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seviye seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GRADE_LEVELS.map(level => (
                            <SelectItem key={level} value={level}>{level === 'YKS' ? 'YKS' : `${level}. Sınıf`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Ders Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Matematik" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting} className="self-end">
                {isSubmitting ? 'Ekleniyor...' : 'Ders Ekle'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="space-y-8 mt-6">
        {groupedSubjects.map(({ grade, subjects: gradeSubjects }) => (
          gradeSubjects.length > 0 && (
            <div key={grade}>
              <h2 className="text-2xl font-semibold font-headline mb-4">{grade === 'YKS' ? 'YKS' : `${grade}. Sınıf`}</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {gradeSubjects.map((subject) => (
                  <Card key={subject.id}>
                    <CardHeader>
                        <CardTitle className='flex justify-between items-center'>
                            <span className='flex items-center gap-2'>
                              <Library className='w-6 h-6' />
                              {subject.name}
                            </span>
                            <div className='flex items-center'>
                               <Dialog onOpenChange={(open) => {
                                  if (!open) setEditingSubject(null);
                                  else {
                                      setEditingSubject(subject);
                                      editSubjectForm.reset({ name: subject.name, gradeLevel: subject.gradeLevel });
                                  }
                               }}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                      <DialogHeader>
                                          <DialogTitle>Dersi Düzenle</DialogTitle>
                                      </DialogHeader>
                                      <Form {...editSubjectForm}>
                                          <form id={`edit-subject-form-${subject.id}`} onSubmit={editSubjectForm.handleSubmit(handleEditSubject)} className="space-y-4">
                                               <FormField
                                                  control={editSubjectForm.control}
                                                  name="gradeLevel"
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel>Sınıf Seviyesi</FormLabel>
                                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                          <SelectTrigger>
                                                            <SelectValue placeholder="Seviye seçin" />
                                                          </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                          {GRADE_LEVELS.map(level => (
                                                            <SelectItem key={level} value={level}>{level === 'YKS' ? 'YKS' : `${level}. Sınıf`}</SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                      <FormMessage />
                                                    </FormItem>
                                                  )}
                                                />
                                               <FormField
                                                  control={editSubjectForm.control}
                                                  name="name"
                                                  render={({ field }) => (
                                                  <FormItem>
                                                      <FormLabel>Ders Adı</FormLabel>
                                                      <FormControl><Input {...field} /></FormControl>
                                                      <FormMessage />
                                                  </FormItem>
                                                  )}
                                              />
                                          </form>
                                      </Form>
                                       <DialogFooter>
                                          <DialogClose asChild>
                                              <Button type="button" variant="secondary">İptal</Button>
                                          </DialogClose>
                                          <Button type="submit" form={`edit-subject-form-${subject.id}`} disabled={editSubjectForm.formState.isSubmitting}>
                                              {editSubjectForm.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                                          </Button>
                                      </DialogFooter>
                                  </DialogContent>
                               </Dialog>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Bu işlem geri alınamaz. "{subject.name}" dersini ve içindeki tüm konuları kalıcı olarak silecektir.
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel>İptal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)}>
                                          Sil
                                      </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </div>
                        </CardTitle>
                        <CardDescription>Bu derse ait konuları yönetin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...topicForm}>
                          <form onSubmit={topicForm.handleSubmit((values) => onTopicSubmit(subject.id, values))} className='flex items-start gap-2 mb-4'>
                               <FormField
                                  control={topicForm.control}
                                  name="name"
                                  render={({ field }) => (
                                  <FormItem className="flex-1">
                                      <FormLabel className='sr-only'>Konu Adı</FormLabel>
                                      <FormControl>
                                      <Input placeholder="Yeni konu ekle" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                              <Button type="submit" size="sm" disabled={isSubmitting}><PlusCircle className='w-4 h-4 mr-2' /> Ekle</Button>
                          </form>
                      </Form>
                      <div className='space-y-2 mt-4 max-h-48 overflow-y-auto pr-2'>
                          {subject.topics && subject.topics.length > 0 ? (
                             subject.topics.sort((a,b) => a.name.localeCompare(b.name)).map((topic) => (
                                 <div key={topic.id} className='flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md'>
                                     <span>{topic.name}</span>
                                     <Button variant="ghost" size="icon" className='h-6 w-6' onClick={() => handleTopicDelete(subject.id, topic)}>
                                         <XCircle className='w-4 h-4' />
                                     </Button>
                                 </div>
                             ))
                          ) : (
                              <p className='text-sm text-muted-foreground text-center py-4'>Henüz konu eklenmemiş.</p>
                          )}
                      </div>
                    </CardContent>
                </Card>
                ))}
              </div>
              <Separator className="mt-8" />
            </div>
          )
        ))}
      </div>
    </div>
  );
}
