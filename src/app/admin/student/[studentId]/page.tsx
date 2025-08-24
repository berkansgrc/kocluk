
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Student, Assignment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, BookCheck, FileUp, KeyRound } from 'lucide-react';
import SolvedQuestionsChart from '@/components/reports/solved-questions-chart';
import StudyDurationChart from '@/components/reports/study-duration-chart';
import StrengthWeaknessMatrix from '@/components/reports/strength-weakness-matrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { sendPasswordResetEmail } from 'firebase/auth';

const assignmentFormSchema = z.object({
  title: z.string().min(3, { message: 'Ödev başlığı en az 3 karakter olmalıdır.' }),
  driveLink: z.string().url({ message: 'Lütfen geçerli bir Google Drive linki girin.' }),
});


export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth(); // isAdmin kontrolünü merkezi hook'a bırakıyoruz.
  const { toast } = useToast();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const assignmentForm = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: { title: '', driveLink: '' },
  });


  useEffect(() => {
    if (!studentId || !user) return;
    
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const studentDocRef = doc(db, 'students', studentId);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
          setStudent({ id: studentDocSnap.id, ...studentDocSnap.data() } as Student);
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
  }, [studentId, toast, router, user]);

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
      // Refresh student data locally
      setStudent(prev => prev ? ({ ...prev, assignments: [...(prev.assignments || []), newAssignment] }) : null);
    } catch (error) {
       console.error("Ödev atanırken hata:", error);
       toast({ title: 'Hata', description: 'Ödev atanırken bir sorun oluştu.', variant: 'destructive' });
    }
  }

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

  // Yetki kontrolü artık useAuth hook'u tarafından yönetildiği için buradaki yönlendirme kaldırıldı.
  // Bu, "render sırasında setState" hatasını çözer.
  
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
