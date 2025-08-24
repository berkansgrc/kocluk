
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Assignment, Resource } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, BookCheck, FileUp, KeyRound, BookOpen, Trash2, Settings, Target } from 'lucide-react';
import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendPasswordResetEmail } from 'firebase/auth';

const assignmentFormSchema = z.object({
  title: z.string().min(3, { message: 'Ödev başlığı en az 3 karakter olmalıdır.' }),
  driveLink: z.string().url({ message: 'Lütfen geçerli bir Google Drive linki girin.' }),
});

const resourceFormSchema = z.object({
  title: z.string().min(3, { message: "Başlık en az 3 karakter olmalıdır."}),
  description: z.string().min(10, { message: "Açıklama en az 10 karakter olmalıdır."}),
  link: z.string().url({ message: 'Lütfen geçerli bir URL girin.' }),
  type: z.enum(['note', 'exercise', 'video'], { required_error: "Kaynak türü seçmek zorunludur."}),
});

const settingsFormSchema = z.object({
  weeklyQuestionGoal: z.coerce.number().int().min(1, { message: 'Haftalık hedef en az 1 olmalıdır.' }),
});


export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const assignmentForm = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: { title: '', driveLink: '' },
  });

  const resourceForm = useForm<z.infer<typeof resourceFormSchema>>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: { title: '', description: '', link: '', type: 'note'},
  });

  const settingsForm = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
  });

  useEffect(() => {
    if (!studentId || !user) return;
    
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const studentDocRef = doc(db, 'students', studentId);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
          const studentData = { id: studentDocSnap.id, ...studentDocSnap.data() } as Student
          setStudent(studentData);
          settingsForm.reset({ weeklyQuestionGoal: studentData.weeklyQuestionGoal });

        } else {
          toast({ title: 'Hata', description: 'Öğrenci bulunamadı.', variant: 'destructive' });
          router.push('/admin');
        }
      } catch (error) {
        console.error("Öğrenci verisi alınırken hata:", error);
        toast({ title: 'Hata', description: 'Öğrenci verileri alınamadı.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudent();
  }, [studentId, toast, router, user, settingsForm]);

  const handleAssignmentSubmit = async (values: z.infer<typeof assignmentFormSchema>) => {
    if (!student) return;

    const newAssignment: Assignment = {
      id: new Date().toISOString(),
      ...values,
      assignedAt: Timestamp.now(),
    };

    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        assignments: arrayUnion(newAssignment)
      });
      toast({ title: 'Başarılı!', description: 'Ödev başarıyla öğrenciye atandı.' });
      assignmentForm.reset();
      setStudent(prev => prev ? ({ ...prev, assignments: [...(prev.assignments || []), newAssignment] }) : null);
    } catch (error) {
       console.error("Ödev atanırken hata:", error);
       toast({ title: 'Hata', description: 'Ödev atanırken bir sorun oluştu.', variant: 'destructive' });
    }
  }

  const handleResourceSubmit = async (values: z.infer<typeof resourceFormSchema>) => {
    if (!student) return;
    const newResource: Resource = {
      id: new Date().toISOString(),
      ...values
    };
    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        resources: arrayUnion(newResource)
      });
      toast({ title: 'Başarılı!', description: 'Kaynak başarıyla eklendi.' });
      resourceForm.reset();
      setStudent(prev => prev ? ({ ...prev, resources: [...(prev.resources || []), newResource] }) : null);
    } catch (error) {
      console.error("Kaynak eklenirken hata:", error);
      toast({ title: 'Hata', description: 'Kaynak eklenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };

  const handleResourceDelete = async (resource: Resource) => {
    if (!student) return;
    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        resources: arrayRemove(resource)
      });
      toast({ title: 'Başarılı!', description: 'Kaynak başarıyla silindi.' });
      setStudent(prev => prev ? ({ ...prev, resources: (prev.resources || []).filter(r => r.id !== resource.id) }) : null);
    } catch (error) {
      console.error("Kaynak silinirken hata:", error);
      toast({ title: 'Hata', description: 'Kaynak silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  };


  const handlePasswordReset = async () => {
    if (!student?.email) return;
    try {
      await sendPasswordResetEmail(auth, student.email);
      toast({
        title: 'Başarılı!',
        description: `${student.name} adlı öğrenci için şifre sıfırlama e-postası gönderildi.`,
      });
    } catch (error) {
      console.error('Şifre sıfırlama e-postası gönderilirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Şifre sıfırlama e-postası gönderilemedi.',
        variant: 'destructive',
      });
    }
  };

  const handleSettingsSubmit = async (values: z.infer<typeof settingsFormSchema>) => {
    if (!student) return;
    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        weeklyQuestionGoal: values.weeklyQuestionGoal,
      });
      toast({ title: 'Başarılı!', description: 'Öğrenci ayarları güncellendi.' });
      setStudent(prev => prev ? ({ ...prev, weeklyQuestionGoal: values.weeklyQuestionGoal }) : null);
    } catch (error) {
      console.error("Ayarlar güncellenirken hata:", error);
      toast({ title: 'Hata', description: 'Ayarlar güncellenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };

  if (loading || !student) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 mt-2" />
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-3"><Skeleton className="h-96 w-full" /></div>
          <div className="lg:col-span-2"><Skeleton className="h-96 w-full" /></div>
          <div><Skeleton className="h-80 w-full" /></div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
           <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {student.name} - Öğrenci Detayları
          </h1>
          <p className="text-muted-foreground">
            {student.email}
          </p>
        </div>
          <Button variant="outline" onClick={handlePasswordReset}>
            <KeyRound className="mr-2 h-4 w-4" />
            Şifre Sıfırlama E-postası Gönder
          </Button>
      </div>
      <Separator />

      <h2 className="text-2xl font-bold tracking-tight mt-8">Öğrenci Ayarları</h2>
        <Separator className="my-4" />
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target /> Haftalık Hedef
              </CardTitle>
              <CardDescription>
                Öğrencinin haftalık soru çözme hedefini belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
                  <FormField
                    control={settingsForm.control}
                    name="weeklyQuestionGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Haftalık Soru Sayısı</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={settingsForm.formState.isSubmitting}>
                    {settingsForm.formState.isSubmitting ? 'Kaydediliyor...' : 'Hedefi Kaydet'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>


      <h2 className="text-2xl font-bold tracking-tight mt-8">Ödev Yönetimi</h2>
       <Separator className="my-4" />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp /> Yeni Ödev Gönder
              </CardTitle>
              <CardDescription>
                Öğrenciye Google Drive üzerinden bir döküman linki atayın.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...assignmentForm}>
                <form onSubmit={assignmentForm.handleSubmit(handleAssignmentSubmit)} className="space-y-4">
                  <FormField
                    control={assignmentForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ödev Başlığı</FormLabel>
                        <FormControl><Input placeholder="Örn. Trigonometri Testi" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={assignmentForm.control}
                    name="driveLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Drive Linki</FormLabel>
                        <FormControl><Input placeholder="https://docs.google.com/..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={assignmentForm.formState.isSubmitting}>
                    {assignmentForm.formState.isSubmitting ? 'Gönderiliyor...' : 'Ödevi Gönder'}
                  </Button>
                </form>
              </Form>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookCheck /> Atanmış Ödevler
              </CardTitle>
              <CardDescription>
                Bu öğrenciye atanmış olan tüm ödevler.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.assignments && student.assignments.length > 0 ? (
                <ul className="space-y-2">
                  {student.assignments.map(ass => (
                    <li key={ass.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                      <span>{ass.title}</span>
                       <Button variant="outline" size="sm" asChild>
                        <a href={ass.driveLink} target="_blank" rel="noopener noreferrer">
                          Görüntüle
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Henüz atanmış bir ödev bulunmuyor.</p>
              )}
            </CardContent>
        </Card>
      </div>

       <div className='mt-8'>
        <h2 className="text-2xl font-bold tracking-tight">Kaynakları Yönet</h2>
        <Separator className="my-4" />
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen /> Yeni Kaynak Ekle
                    </CardTitle>
                    <CardDescription>
                        Öğrenciye özel çalışma materyali (video, döküman, alıştırma) atayın.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...resourceForm}>
                        <form onSubmit={resourceForm.handleSubmit(handleResourceSubmit)} className="space-y-4">
                            <FormField control={resourceForm.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kaynak Başlığı</FormLabel>
                                    <FormControl><Input placeholder="Örn. Türev Konu Anlatımı" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={resourceForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Açıklama</FormLabel>
                                    <FormControl><Textarea placeholder="Kaynağın içeriği hakkında kısa bilgi." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={resourceForm.control} name="link" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kaynak Linki</FormLabel>
                                    <FormControl><Input placeholder="https://www.youtube.com/..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={resourceForm.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kaynak Türü</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Bir tür seçin" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="note">Ders Notu</SelectItem>
                                            <SelectItem value="exercise">Alıştırma</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={resourceForm.formState.isSubmitting}>
                                {resourceForm.formState.isSubmitting ? 'Ekleniyor...' : 'Kaynağı Ekle'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Atanmış Kaynaklar</CardTitle>
                    <CardDescription>Bu öğrenciye atanmış kaynakların listesi.</CardDescription>
                </CardHeader>
                <CardContent>
                     {student.resources && student.resources.length > 0 ? (
                        <ul className="space-y-2">
                        {student.resources.map(res => (
                            <li key={res.id} className="text-sm p-2 border rounded-md flex justify-between items-center group">
                                <div className='flex flex-col'>
                                    <a href={res.link} target='_blank' rel='noopener noreferrer' className='font-medium hover:underline'>{res.title}</a>
                                    <span className='text-xs text-muted-foreground'>{res.description}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleResourceDelete(res)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">Henüz atanmış bir kaynak bulunmuyor.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

       <h2 className="text-2xl font-bold tracking-tight mt-8">Performans Analizi</h2>
       <Separator />
       
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-6">
        <div className="lg:col-span-3">
          <SolvedQuestionsChart studySessions={student.studySessions || []} />
        </div>
        <div className="lg:col-span-2">
          <StudyDurationChart studySessions={student.studySessions || []} />
        </div>
      </div>
      <div>
        <StrengthWeaknessMatrix studySessions={student.studySessions || []} />
      </div>
    </div>
  );
}

    