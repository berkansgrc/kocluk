
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Assignment, Resource, StudySession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, BookCheck, FileUp, KeyRound, BookOpen, Trash2, Settings, Target, GraduationCap, Pencil, ChevronLeft, ChevronRight, Download } from 'lucide-react';
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
import PerformanceEffortMatrix from '@/components/reports/performance-effort-matrix';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  sub,
  add,
  format,
  fromUnixTime
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';


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
  className: z.string().optional(),
});

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'all';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const reportRef = useRef<HTMLDivElement>(null);

  const assignmentForm = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: { title: '', driveLink: '' },
  });

  const editAssignmentForm = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
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
          settingsForm.reset({ 
            weeklyQuestionGoal: studentData.weeklyQuestionGoal,
            className: studentData.className || '',
          });

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

   const { filteredSessions, dateRangeDisplay } = useMemo(() => {
    if (!student || !student.studySessions) {
      return { filteredSessions: [], dateRangeDisplay: '' };
    }
  
    const allSessions = student.studySessions.map(s => {
      let sessionDate;
      if (s.date && typeof s.date.seconds === 'number') {
        sessionDate = fromUnixTime(s.date.seconds);
      } else {
        // Fallback for older string-based dates
        const parsedDate = new Date(s.date);
        if (!isNaN(parsedDate.getTime())) {
          sessionDate = parsedDate;
        }
      }
      return { ...s, date: sessionDate };
    }).filter(s => s.date instanceof Date && !isNaN(s.date.getTime()));
  
    if (timeRange === 'all') {
      return { filteredSessions: allSessions, dateRangeDisplay: 'Tüm Zamanlar' };
    }
  
    let start: Date, end: Date;
  
    switch (timeRange) {
      case 'weekly':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'yearly':
        start = startOfYear(currentDate);
        end = endOfYear(currentDate);
        break;
      default:
        // Should not happen, but as a fallback
        return { filteredSessions: allSessions, dateRangeDisplay: 'Tüm Zamanlar' };
    }
    
    const filtered = allSessions.filter(session => {
        const sessionDate = session.date;
        return sessionDate && sessionDate >= start && sessionDate <= end;
    });
  
    let display;
    if (timeRange === 'weekly') {
      display = `${format(start, 'd MMMM', { locale: tr })} - ${format(end, 'd MMMM yyyy', { locale: tr })}`;
    } else if (timeRange === 'monthly') {
      display = format(currentDate, 'MMMM yyyy', { locale: tr });
    } else { // yearly
      display = format(currentDate, 'yyyy', { locale: tr });
    }
  
    return { filteredSessions: filtered, dateRangeDisplay: display };
  }, [student, timeRange, currentDate]);

  const handleTimeNav = (direction: 'prev' | 'next') => {
    const amount = direction === 'prev' ? -1 : 1;
    let newDate;
    switch (timeRange) {
      case 'weekly':
        newDate = add(currentDate, { weeks: amount });
        break;
      case 'monthly':
        newDate = add(currentDate, { months: amount });
        break;
      case 'yearly':
        newDate = add(currentDate, { years: amount });
        break;
      default:
        return;
    }
    setCurrentDate(newDate);
  };

  const handleAssignmentSubmit = async (values: z.infer<typeof assignmentFormSchema>) => {
    if (!student) return;

    const newAssignment: Assignment = {
      id: new Date().toISOString(),
      title: values.title,
      driveLink: values.driveLink,
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

  const handleAssignmentEdit = async (values: z.infer<typeof assignmentFormSchema>) => {
    if (!student || !editingAssignment) return;
    
    const updatedAssignments = (student.assignments || []).map(ass => 
      ass.id === editingAssignment.id ? { ...ass, ...values, assignedAt: editingAssignment.assignedAt } : ass
    );

    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        assignments: updatedAssignments
      });
      toast({ title: 'Başarılı!', description: 'Ödev başarıyla güncellendi.' });
      setStudent(prev => prev ? ({ ...prev, assignments: updatedAssignments }) : null);
      setEditingAssignment(null);
    } catch (error) {
      console.error("Ödev güncellenirken hata:", error);
      toast({ title: 'Hata', description: 'Ödev güncellenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };

  const handleAssignmentDelete = async (assignmentToDelete: Assignment) => {
    if (!student) return;

    // Find the full assignment object to be deleted, because Firestore arrayRemove needs the exact object.
    const assignmentInState = (student.assignments || []).find(a => a.id === assignmentToDelete.id);
    if (!assignmentInState) {
        toast({ title: 'Hata', description: 'Silinecek ödev bulunamadı.', variant: 'destructive' });
        return;
    }

    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        assignments: arrayRemove(assignmentInState)
      });
      toast({ title: 'Başarılı!', description: 'Ödev başarıyla silindi.' });
      setStudent(prev => prev ? ({ ...prev, assignments: (prev.assignments || []).filter(a => a.id !== assignmentToDelete.id) }) : null);
    } catch (error) {
       console.error("Ödev silinirken hata:", error);
       toast({ title: 'Hata', description: 'Ödev silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  };

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
        className: values.className || '',
      });
      toast({ title: 'Başarılı!', description: 'Öğrenci ayarları güncellendi.' });
      setStudent(prev => prev ? ({ ...prev, weeklyQuestionGoal: values.weeklyQuestionGoal, className: values.className }) : null);
    } catch (error) {
      console.error("Ayarlar güncellenirken hata:", error);
      toast({ title: 'Hata', description: 'Ayarlar güncellenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };
  
  const handleDownloadPdf = async () => {
    const element = reportRef.current;
    if (!element || !student) return;

    setIsDownloading(true);
    toast({ title: 'Rapor Oluşturuluyor...', description: 'Lütfen bekleyin, PDF dosyası hazırlanıyor.' });


    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true, 
      logging: false,
      backgroundColor: window.getComputedStyle(document.body).backgroundColor, // Match background
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    
    const width = pdfWidth - 40; // with some margin
    const height = width / ratio;

    pdf.addImage(imgData, 'PNG', 20, 20, width, height);
    pdf.save(`${student.name.replace(' ', '_')}-Rapor-${dateRangeDisplay.replace(' ', '_')}.pdf`);
    setIsDownloading(false);
    toast({ title: 'Başarılı!', description: 'Rapor PDF olarak indirildi.' });

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
            {student.email} {student.className && `• ${student.className}`}
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
        <div className="grid gap-6 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings /> Genel Ayarlar
              </CardTitle>
              <CardDescription>
                Öğrencinin temel ayarlarını ve hedeflerini yönetin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-4">
                  <div className='grid md:grid-cols-2 gap-4'>
                  <FormField
                    control={settingsForm.control}
                    name="weeklyQuestionGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Haftalık Soru Hedefi</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="className"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sınıf</FormLabel>
                        <FormControl>
                          <Input placeholder="Örn: 8-A" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  <Button type="submit" className="w-full" disabled={settingsForm.formState.isSubmitting}>
                    {settingsForm.formState.isSubmitting ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
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
                <FileUp /> Manuel Ödev Gönder
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
                  {(student.assignments || []).sort((a,b) => b.assignedAt.toMillis() - a.assignedAt.toMillis()).map(ass => (
                    <li key={ass.id} className="text-sm p-2 border rounded-md flex justify-between items-center group">
                      <a href={ass.driveLink} target="_blank" rel="noopener noreferrer" className="hover:underline flex-1 truncate pr-2">
                        {ass.title}
                      </a>
                       <div className='flex items-center'>

                        <Dialog onOpenChange={(open) => {
                            if (!open) {
                                setEditingAssignment(null);
                            } else {
                                setEditingAssignment(ass);
                                editAssignmentForm.reset({
                                  title: ass.title,
                                  driveLink: ass.driveLink,
                                });
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Ödevi Düzenle</DialogTitle>
                                    <DialogDescription>
                                        Ödevin başlığını veya linkini güncelleyebilirsiniz.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...editAssignmentForm}>
                                    <form id={`edit-assignment-form-${ass.id}`} onSubmit={editAssignmentForm.handleSubmit(handleAssignmentEdit)} className="space-y-4">
                                        <FormField
                                            control={editAssignmentForm.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Ödev Başlığı</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editAssignmentForm.control}
                                            name="driveLink"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Google Drive Linki</FormLabel>
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
                                    <Button type="submit" form={`edit-assignment-form-${ass.id}`} disabled={editAssignmentForm.formState.isSubmitting}>
                                        {editAssignmentForm.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>


                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu işlem geri alınamaz. "{ass.title}" başlıklı ödevi kalıcı olarak silecektir.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleAssignmentDelete(ass)}>
                                    Sil
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                       </div>
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
      
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Performans Analizi</h2>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'İndiriliyor...' : 'Raporu İndir'}
          </Button>
        </div>
        <Separator className="my-4" />
      </div>

       <div className='flex flex-col items-center gap-4'>
            <div className='flex items-center gap-2'>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('weekly'); setCurrentDate(new Date()); }} className={cn(timeRange === 'weekly' && 'bg-accent')}>Haftalık</Button>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('monthly'); setCurrentDate(new Date()); }} className={cn(timeRange === 'monthly' && 'bg-accent')}>Aylık</Button>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('yearly'); setCurrentDate(new Date()); }} className={cn(timeRange === 'yearly' && 'bg-accent')}>Yıllık</Button>
                <Button variant="outline" size="sm" onClick={() => { setTimeRange('all'); setCurrentDate(new Date()); }} className={cn(timeRange === 'all' && 'bg-accent')}>Tümü</Button>
            </div>
            {timeRange !== 'all' && (
                <div className='flex items-center gap-4'>
                    <Button variant="ghost" size="icon" onClick={() => handleTimeNav('prev')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <p className='text-lg font-semibold text-center w-64'>{dateRangeDisplay}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleTimeNav('next')}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            )}
       </div>
       
      <div ref={reportRef} className="bg-background p-4 rounded-lg">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mt-6">
            <div className="lg:col-span-3">
            <SolvedQuestionsChart studySessions={filteredSessions} />
            </div>
            <div className="lg:col-span-2">
            <StudyDurationChart studySessions={filteredSessions} />
            </div>
        </div>
        <div className="grid gap-6 mt-6">
            <StrengthWeaknessMatrix studySessions={filteredSessions} />
            <PerformanceEffortMatrix studySessions={filteredSessions} />
        </div>
      </div>
    </div>
  );
}
