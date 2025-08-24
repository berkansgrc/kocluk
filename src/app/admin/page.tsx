
'use client';

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
import { Separator } from '@/components/ui/separator';
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
import { AreaChart, BadgePercent, GraduationCap, Trash2, UserPlus, Users } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Student } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
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
import { startOfWeek, isAfter, fromUnixTime } from 'date-fns';


const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.' }),
  email: z
    .string()
    .email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
  className: z.string().optional(),
  parentEmail: z.string().email({ message: 'Lütfen geçerli bir veli e-posta adresi girin.' }),
  parentPassword: z.string().min(6, { message: 'Veli şifresi en az 6 karakter olmalıdır.' }),
});

export default function AdminPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();

  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      className: '',
      parentEmail: '',
      parentPassword: '',
    },
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsList = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Student)
      );
      setStudents(studentsList);
    } catch (error) {
      console.error('Öğrenciler getirilirken hata:', error);
      toast({
        title: 'Hata',
        description:
          'Öğrenci listesi alınamadı. Firestore kurallarınızı kontrol edin.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const dashboardStats = useMemo(() => {
    const totalStudents = students.length;
    let totalQuestionsSolved = 0;
    let totalQuestionsCorrect = 0;
    let totalQuestionsThisWeek = 0;

    const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

    students.forEach(student => {
      (student.studySessions || []).forEach(session => {
        totalQuestionsSolved += session.questionsSolved;
        totalQuestionsCorrect += session.questionsCorrect;
        
        const sessionDate = session.date && typeof session.date.seconds === 'number'
          ? fromUnixTime(session.date.seconds)
          : new Date(session.date);
        
        if (isAfter(sessionDate, startOfThisWeek)) {
          totalQuestionsThisWeek += session.questionsSolved;
        }
      });
    });

    const overallAccuracy = totalQuestionsSolved > 0 ? (totalQuestionsCorrect / totalQuestionsSolved) * 100 : 0;

    return {
      totalStudents,
      totalQuestionsThisWeek,
      overallAccuracy
    };
  }, [students]);

  async function onStudentSubmit(values: z.infer<typeof studentFormSchema>) {
    setIsSubmitting(true);
    let studentUser, parentUser;
  
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
  
      const createTempAuth = () => {
        const tempAppName = `temp-app-${Date.now()}-${Math.random()}`;
        const tempApp = initializeApp(auth.app.options, tempAppName);
        return getAuth(tempApp);
      };
  
      // Create Parent User
      const tempAuthParent = createTempAuth();
      const parentUserCredential = await createUserWithEmailAndPassword(tempAuthParent, values.parentEmail, values.parentPassword);
      parentUser = parentUserCredential.user;
  
      // Create Student User
      const tempAuthStudent = createTempAuth();
      const studentUserCredential = await createUserWithEmailAndPassword(tempAuthStudent, values.email, values.password);
      studentUser = studentUserCredential.user;

      // Use a batch write to ensure all or nothing
      const batch = writeBatch(db);

      // 1. Create student document
      const studentDocRef = doc(db, 'students', studentUser.uid);
      batch.set(studentDocRef, {
        name: values.name,
        email: values.email,
        className: values.className || '',
        weeklyQuestionGoal: 100,
        studySessions: [],
        assignments: [],
        parentEmail: values.parentEmail,
        parentId: parentUser.uid,
      });

      // 2. Create student user document
      const studentUserDocRef = doc(db, 'users', studentUser.uid);
      batch.set(studentUserDocRef, {
        uid: studentUser.uid,
        email: values.email,
        role: 'student',
      });

      // 3. Create parent user document
      const parentUserDocRef = doc(db, 'users', parentUser.uid);
      batch.set(parentUserDocRef, {
        uid: parentUser.uid,
        email: values.parentEmail,
        role: 'parent',
        studentId: studentUser.uid, // Link parent to student
      });

      await batch.commit();
  
      toast({
        title: 'Öğrenci ve Veli Eklendi!',
        description: `${values.name} ve velisi başarıyla oluşturuldu.`,
      });
  
      studentForm.reset();
      fetchStudents();
  
    } catch (error: any) {
      console.error('Öğrenci/Veli eklenirken hata: ', error);
      let errorMessage = 'Kullanıcı oluşturulurken bir sorun oluştu.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adreslerinden biri zaten başka bir hesap tarafından kullanılıyor.';
      }
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    setIsDeleting(studentId);
    try {
      // Note: This only deletes the Firestore record.
      // For a full deletion, you would also need to delete the user from Firebase Auth
      // and potentially the parent user and their record in the 'users' collection.
      // This requires backend logic (e.g., a Cloud Function) for security.
      await deleteDoc(doc(db, 'students', studentId));
      
      toast({
        title: 'Firestore Kaydı Silindi',
        description: `${studentName} adlı öğrencinin veritabanı kaydı başarıyla silindi. Lütfen Firebase Authentication'dan da öğrenci ve veli kullanıcılarını manuel olarak silmeyi unutmayın.`,
      });
      fetchStudents(); 
    } catch (error) {
      console.error('Öğrenci silinirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Öğrenci veritabanından silinirken bir sorun oluştu. Güvenlik kurallarınızı kontrol edin.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getStudentStats = (student: Student) => {
    const totalSolved =
      student.studySessions?.reduce((acc, s) => acc + s.questionsSolved, 0) ||
      0;
    const totalCorrect =
      student.studySessions?.reduce((acc, s) => acc + s.questionsCorrect, 0) ||
      0;
    const totalDuration =
      student.studySessions?.reduce((acc, s) => acc + s.durationInMinutes, 0) ||
      0;
    const averageAccuracy =
      totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0;
    return { totalSolved, averageAccuracy, totalDuration };
  };

  const handleRowClick = (studentId: string) => {
    router.push(`/admin/student/${studentId}`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Admin Paneli
          </h1>
          <p className="text-muted-foreground">
            Uygulama verilerini ve genel istatistikleri yönetin.
          </p>
        </div>
      </div>
      <Separator />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam Öğrenci
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Sistemde kayıtlı aktif öğrenci sayısı
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Haftalık Çözülen Soru
            </CardTitle>
            <AreaChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalQuestionsThisWeek}</div>
             <p className="text-xs text-muted-foreground">
              Tüm öğrencilerin bu hafta çözdüğü toplam soru
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genel Başarı Ortalaması</CardTitle>
            <BadgePercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.overallAccuracy.toFixed(1)}%
            </div>
             <p className="text-xs text-muted-foreground">
              Tüm öğrencilerin genel başarı ortalaması
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus /> Yeni Öğrenci Ekle
            </CardTitle>
            <CardDescription>
              Sisteme yeni bir öğrenci ve ilişkili veli hesabı kaydedin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...studentForm}>
              <form
                onSubmit={studentForm.handleSubmit(onStudentSubmit)}
                className="space-y-6"
              >
                <div className='grid md:grid-cols-2 gap-6'>
                  <div className='space-y-4'>
                    <h3 className='text-lg font-medium'>Öğrenci Bilgileri</h3>
                    <FormField control={studentForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>İsim Soyisim</FormLabel>
                        <FormControl><Input placeholder="Örn. Ahmet Yılmaz" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={studentForm.control} name="className" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sınıf</FormLabel>
                        <FormControl><Input placeholder="Örn. 8-A (İsteğe Bağlı)" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={studentForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta Adresi</FormLabel>
                        <FormControl><Input placeholder="ogrenci@eposta.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={studentForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Şifresi</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                  <div className='space-y-4'>
                    <h3 className='text-lg font-medium'>Veli Bilgileri</h3>
                     <FormField control={studentForm.control} name="parentEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Veli E-posta Adresi</FormLabel>
                        <FormControl><Input placeholder="veli@eposta.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={studentForm.control} name="parentPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Veli Başlangıç Şifresi</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Ekleniyor...'
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Öğrenci ve Veliyi Ekle
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users /> Kayıtlı Öğrenciler
                </CardTitle>
                <CardDescription>
                  Sistemde kayıtlı olan tüm öğrencilerin listesi ve durumları.
                  Detaylar için bir öğrenciye tıklayın.
                </Description>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İsim Soyisim</TableHead>
                    <TableHead>Veli E-postası</TableHead>
                    <TableHead>Sınıf</TableHead>
                    <TableHead className="text-right">
                      Toplam Çözülen
                    </TableHead>
                    <TableHead className="text-right">Ortalama Başarı</TableHead>
                    <TableHead className="text-right">
                      Toplam Süre (dk)
                    </TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Kayıtlı öğrenci bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => {
                      const stats = getStudentStats(student);
                      return (
                        <TableRow
                          key={student.id}
                          className="cursor-pointer"
                          onClick={() => handleRowClick(student.id)}
                        >
                          <TableCell className="font-medium">
                            {student.name}
                          </TableCell>
                          <TableCell>
                            {student.parentEmail || student.email}
                          </TableCell>
                           <TableCell>
                            {student.className || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.totalSolved}
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.averageAccuracy.toFixed(1)}%
                          </TableCell>
                           <TableCell className="text-right">
                            {stats.totalDuration}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isDeleting === student.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Emin misiniz?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bu işlem geri alınamaz. Bu, {student.name}{' '}
                                    adlı öğrencinin verilerini sunucularımızdan
                                    kalıcı olarak silecektir. Bu işlem kullanıcıyı 
                                    Firebase Authentication'dan silmez,
                                    oradan manuel olarak silmeniz gerekir.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel  onClick={(e) => e.stopPropagation()}>İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStudent(
                                        student.id,
                                        student.name
                                      )
                                    }}
                                  >
                                    Sil
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
