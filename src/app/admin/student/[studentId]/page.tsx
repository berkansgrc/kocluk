
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Assignment, Resource, StudySession, Subject, Topic, WeeklyPlanItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, BookCheck, FileUp, KeyRound, BookOpen, Trash2, Settings, Target, GraduationCap, Pencil, ChevronLeft, ChevronRight, Download, Bot, CalendarDays, PlusCircle } from 'lucide-react';
import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendPasswordResetEmail } from 'firebase/auth';
import PerformanceEffortMatrix from '@/components/reports/performance-effort-matrix';
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
  add,
  format,
  fromUnixTime
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PerformanceTrendChart from '@/components/reports/performance-trend-chart';
import { AppLayout } from '@/components/app-layout';
import TopicStudyChart from '@/components/reports/topic-study-chart';
import EventCalendar from '@/components/dashboard/event-calendar';

const dayOrder = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const GRADE_LEVELS = ["5", "6", "7", "8", "9", "10", "11", "12", "YKS"];

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

const planTaskFormSchema = z.object({
  gradeLevel: z.string().min(1, "Sınıf seviyesi seçmek zorunludur."),
  subjectId: z.string().min(1, "Ders seçmek zorunludur."),
  topicId: z.string().min(1, "Konu seçmek zorunludur."),
  goal: z.string().min(3, "Hedef en az 3 karakter olmalıdır."),
});

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'all';

function StudentDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const planTaskForm = useForm<z.infer<typeof planTaskFormSchema>>({
      resolver: zodResolver(planTaskFormSchema),
      defaultValues: { gradeLevel: '', subjectId: '', topicId: '', goal: '' },
  });
  
  const selectedGradeLevel = planTaskForm.watch('gradeLevel');
  const selectedSubjectId = planTaskForm.watch('subjectId');

  const filteredSubjectsForPlan = useMemo(() => subjects.filter(s => s.gradeLevel === selectedGradeLevel), [subjects, selectedGradeLevel]);
  const selectedSubjectForPlan = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId]);
  
  useEffect(() => {
    planTaskForm.resetField('subjectId');
    planTaskForm.resetField('topicId');
  }, [selectedGradeLevel, planTaskForm]);
  
  useEffect(() => {
    planTaskForm.resetField('topicId');
  }, [selectedSubjectId, planTaskForm]);


  const fetchStudentAndSubjects = useCallback(async () => {
    if (!studentId || !user) return;
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

      const subjectsQuerySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = subjectsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)).sort((a,b) => a.name.localeCompare(b.name));
      setSubjects(subjectsList);

    } catch (error) {
      console.error("Öğrenci veya ders verisi alınırken hata:", error);
      toast({ title: 'Hata', description: 'Gerekli veriler alınamadı.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [studentId, toast, router, user, settingsForm]);

  useEffect(() => {
    setLoading(true);
    fetchStudentAndSubjects();
  }, [fetchStudentAndSubjects]);

  const { filteredSessions, dateRangeDisplay } = useMemo(() => {
    if (!student || !student.studySessions) {
      return { filteredSessions: [], dateRangeDisplay: '' };
    }
  
    const allSessions = student.studySessions.map(s => {
      let sessionDate;
      if (s.date && typeof s.date.seconds === 'number') {
        sessionDate = fromUnixTime(s.date.seconds);
      } else {
        const parsedDate = new Date(s.date);
        if (!isNaN(parsedDate.getTime())) {
          sessionDate = parsedDate;
        } else {
            return { ...s, date: null };
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
    } else { 
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
      isNew: true,
    };

    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        assignments: arrayUnion(newAssignment)
      });
      toast({ title: 'Başarılı!', description: 'Ödev başarıyla öğrenciye atandı.' });
      assignmentForm.reset();
      fetchStudentAndSubjects();
    } catch (error) {
       console.error("Ödev atanırken hata:", error);
       toast({ title: 'Hata', description: 'Ödev atanırken bir sorun oluştu.', variant: 'destructive' });
    }
  }

  const handleAssignmentEdit = async (values: z.infer<typeof assignmentFormSchema>) => {
    if (!student || !editingAssignment) return;
    
    const updatedAssignments = (student.assignments || []).map(ass => 
      ass.id === editingAssignment.id ? { ...ass, ...values, isNew: ass.isNew, assignedAt: editingAssignment.assignedAt } : ass
    );

    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, {
        assignments: updatedAssignments
      });
      toast({ title: 'Başarılı!', description: 'Ödev başarıyla güncellendi.' });
      fetchStudentAndSubjects();
      setEditingAssignment(null);
    } catch (error) {
      console.error("Ödev güncellenirken hata:", error);
      toast({ title: 'Hata', description: 'Ödev güncellenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };

  const handleAssignmentDelete = async (assignmentToDelete: Assignment) => {
    if (!student) return;
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
      fetchStudentAndSubjects();
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
      fetchStudentAndSubjects();
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
      fetchStudentAndSubjects();
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
      fetchStudentAndSubjects();
    } catch (error) {
      console.error("Ayarlar güncellenirken hata:", error);
      toast({ title: 'Hata', description: 'Ayarlar güncellenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };
  
  const handleAddTask = async (values: z.infer<typeof planTaskFormSchema>) => {
    if (!student || !selectedDay) return;
    
    const subject = subjects.find(s => s.id === values.subjectId);
    const topic = subject?.topics.find(t => t.id === values.topicId);

    if (!subject || !topic) {
        toast({ title: 'Hata', description: 'Geçersiz ders veya konu seçimi.', variant: 'destructive' });
        return;
    }

    const newTask: WeeklyPlanItem = {
      id: new Date().toISOString(),
      day: selectedDay,
      subject: subject.name,
      topic: topic.name,
      goal: values.goal,
      isCompleted: false,
    };
    
    try {
      const studentDocRef = doc(db, 'students', student.id);
      await updateDoc(studentDocRef, { 
        weeklyPlan: arrayUnion(newTask),
        isPlanNew: true,
      });
      toast({ title: 'Başarılı!', description: `${selectedDay} gününe yeni görev eklendi.` });
      planTaskForm.reset({ gradeLevel: '', subjectId: '', topicId: '', goal: '' });
      setSelectedDay(null); // Close the dialog
      fetchStudentAndSubjects(); // Refresh data
    } catch (error) {
      console.error("Plan görevi eklenirken hata:", error);
      toast({ title: 'Hata', description: 'Görev eklenirken bir sorun oluştu.', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (task: WeeklyPlanItem) => {
    if (!student) return;
    try {
        const studentDocRef = doc(db, 'students', student.id);
        await updateDoc(studentDocRef, { 
            weeklyPlan: arrayRemove(task),
        });
        toast({ title: 'Başarılı!', description: 'Görev başarıyla silindi.' });
        fetchStudentAndSubjects();
    } catch (error) {
        console.error("Görev silinirken hata:", error);
        toast({ title: 'Hata', description: 'Görev silinirken bir sorun oluştu.', variant: 'destructive' });
    }
  };


  const handleDownloadPdf = async () => {
    const reportContainer = reportRef.current;
    if (!reportContainer || !student) return;

    setIsDownloading(true);
    toast({ title: 'Rapor Oluşturuluyor...', description: 'Lütfen bekleyin, PDF dosyası hazırlanıyor.' });

    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    try {
        const reportCards = Array.from(reportContainer.querySelectorAll('.report-card')) as HTMLElement[];
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        let yPosition = margin;

        const cardBgColor = `hsl(${window.getComputedStyle(document.documentElement).getPropertyValue('--card').trim()})` || '#ffffff';


        for (const card of reportCards) {
            const canvas = await html2canvas(card, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: cardBgColor,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const imgWidth = pdfWidth - margin * 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (yPosition + imgHeight + margin > pdfHeight) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.addImage(imgData, 'JPEG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 20;
        }
        
        pdf.save(`${student.name.replace(' ', '_')}-Rapor-${dateRangeDisplay.replace(' ', '_')}.pdf`);
        
        toast({ title: 'Başarılı!', description: 'Rapor PDF olarak indirildi.' });
    } catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        toast({ title: 'Hata', description: 'PDF raporu oluşturulurken bir sorun oluştu.', variant: 'destructive' });
    } finally {
        setIsDownloading(false);
    }
  };

  
  if (loading || !student) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className='mb-4'>
           <Skeleton className='h-7 w-24' />
        </div>
        <div className='flex items-center justify-between space-y-2'>
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
            <div>
              <Skeleton className='h-10 w-64' />
            </div>
        </div>
        <Separator />
         <div className='grid gap-6 mt-6'>
            <Skeleton className='h-60 w-full' />
            <Skeleton className='h-60 w-full' />
            <div className='grid gap-6 md:grid-cols-2'>
                <Skeleton className='h-80 w-full' />
                <Skeleton className='h-80 w-full' />
            </div>
             <div className='grid gap-6 md:grid-cols-2'>
                <Skeleton className='h-80 w-full' />
                <Skeleton className='h-80 w-full' />
            </div>
            <div>
                 <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-36" />
                </div>
                <Separator className="my-4" />
                 <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-5 mt-6">
                    <div className="lg:col-span-3">
                      <Skeleton className="h-96 w-full" />
                    </div>
                    <div className="lg:col-span-2">
                      <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2">
        <div>
           <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
            {student.name}
          </h1>
          <p className="text-muted-foreground break-words">
            {student.email} {student.className && `• ${student.className}`}
          </p>
        </div>
        <div className="pt-2">
          <Button variant="outline" onClick={handlePasswordReset} className="w-full sm:w-auto">
            <KeyRound className="mr-2 h-4 w-4" />
            Şifre Sıfırlama E-postası
          </Button>
        </div>
      </div>
      <Separator />

       <div className='mt-6'>
        <h2 className="text-2xl font-bold tracking-tight">Haftalık Plan Yönetimi</h2>
        <Separator className="my-4" />
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className='lg:col-span-2'>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <span className='flex items-center gap-2'>
                  <CalendarDays /> Haftalık Ders Programı
                </span>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className='mt-2 sm:mt-0' disabled={!student.weeklyPlan || student.weeklyPlan.length === 0}>
                        <Trash2 className='w-4 h-4 mr-2'/> Tüm Planı Sil
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu işlem geri alınamaz. Öğrencinin mevcut haftalık planındaki tüm görevler kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                             if (!student) return;
                             try {
                                const studentDocRef = doc(db, 'students', student.id);
                                await updateDoc(studentDocRef, { weeklyPlan: [], isPlanNew: false });
                                toast({ title: 'Başarılı!', description: 'Haftalık plan silindi.' });
                                fetchStudentAndSubjects();
                              } catch (error) {
                                console.error("Plan silinirken hata:", error);
                                toast({ title: 'Hata', description: 'Plan silinirken bir sorun oluştu.', variant: 'destructive' });
                              }
                        }}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </CardTitle>
              <CardDescription>
                Öğrenci için haftalık görevleri yönetin. Görev eklemek için ilgili günün butonuna tıklayın.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                    {dayOrder.map(day => (
                        <div key={day} className='border rounded-lg p-4 space-y-3'>
                            <h3 className='font-semibold text-center mb-2'>{day}</h3>
                            <ul className='space-y-2 min-h-24'>
                                {(student.weeklyPlan || []).filter(task => task.day === day).map(task => (
                                    <li key={task.id} className='text-xs p-2 bg-muted/50 rounded-md group relative'>
                                        <p className='font-bold text-primary-dark'>{task.subject}</p>
                                        <p className='font-medium'>{task.topic}</p>
                                        <p className='text-muted-foreground italic mt-1'>{task.goal}</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className='h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100'
                                            onClick={() => handleDeleteTask(task)}>
                                            <Trash2 className='w-3 h-3 text-destructive' />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                             <Dialog onOpenChange={(open) => { if (open) setSelectedDay(day); else setSelectedDay(null); }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className='w-full'><PlusCircle className='w-4 h-4 mr-2' /> Görev Ekle</Button>
                                </DialogTrigger>
                             </Dialog>
                        </div>
                    ))}
                </div>
            </CardContent>
           </Card>
         </div>
      </div>


      <div className='mt-8'>
        <h2 className="text-2xl font-bold tracking-tight">Öğrenci Ayarları</h2>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 gap-6">
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
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
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
                    <Button type="submit" className="w-full sm:w-auto" disabled={settingsForm.formState.isSubmitting}>
                      {settingsForm.formState.isSubmitting ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
      </div>



      <div className='mt-8'>
      <h2 className="text-2xl font-bold tracking-tight">Ödev Yönetimi</h2>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Performans Analizi</h2>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading} className='mt-2 sm:mt-0'>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'İndiriliyor...' : 'Raporu İndir'}
          </Button>
        </div>
        <Separator className="my-4" />
      </div>

       <div className='flex flex-col items-center gap-4'>
            <div className='flex items-center gap-2 flex-wrap justify-center'>
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
                    <p className='text-lg font-semibold text-center w-48 sm:w-64'>{dateRangeDisplay}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleTimeNav('next')}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            )}
       </div>
       
      <div ref={reportRef} className="bg-background p-0 sm:p-4 rounded-lg">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5 mt-6 report-card">
            <div className="lg:col-span-3">
            <SolvedQuestionsChart studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
            </div>
            <div className="lg:col-span-2">
            <StudyDurationChart studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
            </div>
        </div>
        <div className="grid gap-6 mt-6">
          <div className="report-card">
            <TopicStudyChart studySessions={filteredSessions.filter(s => s.type === 'topic')} />
          </div>
          <Card className='report-card'>
            <CardHeader>
              <CardTitle>Ders Performans Trendi</CardTitle>
              <CardDescription>Derslerdeki başarı oranının zaman içindeki değişimini inceleyin.</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTrendChart studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
            </CardContent>
          </Card>
          <Card className='report-card'>
            <CardHeader>
              <CardTitle>Konu Güçlü & Zayıf Yön Matrisi</CardTitle>
              <CardDescription>Farklı derslerdeki ve konulardaki performansınızı analiz edin.</CardDescription>
            </CardHeader>
            <CardContent>
              <StrengthWeaknessMatrix studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
            </CardContent>
          </Card>
          <Card className='report-card'>
            <CardHeader>
              <CardTitle>Performans/Efor Matrisi</CardTitle>
              <CardDescription>Konulara harcadığınız zaman ile o konudaki başarınızı karşılaştırın.</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceEffortMatrix studySessions={filteredSessions.filter(s => s.type !== 'topic')} />
            </CardContent>
          </Card>
        </div>
      </div>
       <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedDay} Günü İçin Görev Ekle</DialogTitle>
            </DialogHeader>
            <Form {...planTaskForm}>
                <form onSubmit={planTaskForm.handleSubmit(handleAddTask)} className="space-y-4">
                    <FormField
                        control={planTaskForm.control}
                        name="gradeLevel"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sınıf Seviyesi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Bir seviye seçin" />
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
                        control={planTaskForm.control}
                        name="subjectId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ders</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGradeLevel}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!selectedGradeLevel ? "Önce seviye seçin" : "Bir ders seçin"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {filteredSubjectsForPlan.map(subject => (
                                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={planTaskForm.control}
                        name="topicId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Konu</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubjectForPlan}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!selectedSubjectForPlan ? "Önce ders seçin" : "Bir konu seçin"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {(selectedSubjectForPlan?.topics || []).map(topic => (
                                    <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                      control={planTaskForm.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hedef / Açıklama</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Örn: 20 soru çöz ve yapamadıklarını analiz et." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setSelectedDay(null)}>İptal</Button>
                        <Button type="submit" disabled={planTaskForm.formState.isSubmitting}>
                            {planTaskForm.formState.isSubmitting ? 'Ekleniyor...' : 'Görevi Ekle'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentDetailPage() {
    return (
        <AppLayout>
            <StudentDetailPageContent />
        </AppLayout>
    )
}

    