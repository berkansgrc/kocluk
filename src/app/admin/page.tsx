
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
import { Checkbox } from '@/components/ui/checkbox';


const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.' }),
  email: z
    .string()
    .email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
  className: z.string().optional(),
});

export default function AdminPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const router = useRouter();

  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      className: '',
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
    try {
      // Firebase'in farklı yapılandırmalara sahip geçici bir kopyasını oluşturma
      // Bu, mevcut admin oturumunu bozmadan yeni bir kullanıcı oluşturmayı sağlar.
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');

      const tempAppName = `temp-app-${Date.now()}`;
      const tempApp = initializeApp(auth.app.options, tempAppName);
      const tempAuth = getAuth(tempApp);

      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        values.email,
        values.password
      );
      const newStudentUser = userCredential.user;

      // Yeni öğrencinin UID'si ile Firestore'da belge oluşturma
      const studentDocRef = doc(db, 'students', newStudentUser.uid);
      await setDoc(studentDocRef, {
        name: values.name,
        email: values.email,
        className: values.className || '',
        weeklyQuestionGoal: 100,
        studySessions: [],
        assignments: [],
      });

      toast({
        title: 'Öğrenci Eklendi!',
        description: `${values.name} adlı öğrenci başarıyla oluşturuldu. Belirlediğiniz şifre ile giriş yapabilir.`,
      });

      studentForm.reset();
      fetchStudents();
    } catch (error: any) {
      console.error('Öğrenci eklenirken hata: ', error);
      let errorMessage = 'Öğrenci oluşturulurken bir sorun oluştu.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage =
          'Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.';
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
      // Önce Firestore veritabanından öğrenci kaydını siliyoruz.
      // Güvenlik kuralları sadece admin'in bu işlemi yapmasına izin verecek.
      await deleteDoc(doc(db, 'students', studentId));
      
      toast({
        title: 'Firestore Kaydı Silindi',
        description: `${studentName} adlı öğrencinin veritabanı kaydı başarıyla silindi. Lütfen Firebase Authentication'dan da kullanıcıyı manuel olarak silmeyi unutmayın.`,
      });
      fetchStudents(); // Listeyi yenile
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

  const handleSelectStudent = (studentId: string, isSelected: boolean) => {
    setSelectedStudents(prev => 
      isSelected ? [...prev, studentId] : prev.filter(id => id !== studentId)
    );
  };
  
  const handleSelectAll = (isSelected: boolean) => {
    setSelectedStudents(isSelected ? students.map(s => s.id) : []);
  }

  const handleCompareClick = () => {
    if (selectedStudents.length < 2) {
      toast({ title: "Yetersiz Seçim", description: "Lütfen karşılaştırmak için en az 2 öğrenci seçin.", variant: "destructive" });
      return;
    }
    router.push(`/admin/compare?students=${selectedStudents.join(',')}`);
  }

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
              Sisteme yeni bir öğrenci kaydedin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...studentForm}>
              <form
                onSubmit={studentForm.handleSubmit(onStudentSubmit)}
                className="space-y-6"
              >
                <div className='grid md:grid-cols-2 gap-4'>
                <FormField
                  control={studentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İsim Soyisim</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn. Ahmet Yılmaz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={studentForm.control}
                  name="className"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sınıf</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn. 8-A (İsteğe Bağlı)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
                <FormField
                  control={studentForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta Adresi</FormLabel>
                      <FormControl>
                        <Input placeholder="ornek@eposta.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç Şifresi</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Ekleniyor...'
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Öğrenciyi Ekle
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
                </CardDescription>
              </div>
              {selectedStudents.length > 1 && (
                <Button onClick={handleCompareClick}>
                   <BadgePercent className="mr-2 h-4 w-4" /> Seçilen {selectedStudents.length} Öğrenciyi Karşılaştır
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-12">
                       <Checkbox 
                         checked={selectedStudents.length === students.length && students.length > 0}
                         onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                       />
                     </TableHead>
                    <TableHead>İsim Soyisim</TableHead>
                    <TableHead>E-posta Adresi</TableHead>
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
                      <TableCell colSpan={8} className="text-center">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Kayıtlı öğrenci bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => {
                      const stats = getStudentStats(student);
                      return (
                        <TableRow key={student.id} data-state={selectedStudents.includes(student.id) && "selected"}>
                           <TableCell>
                             <Checkbox 
                               checked={selectedStudents.includes(student.id)}
                               onCheckedChange={(checked) => handleSelectStudent(student.id, Boolean(checked))}
                             />
                           </TableCell>
                          <TableCell
                            className="font-medium cursor-pointer"
                            onClick={() => handleRowClick(student.id)}
                          >
                            {student.name}
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => handleRowClick(student.id)}
                          >
                            {student.email}
                          </TableCell>
                           <TableCell
                            className="cursor-pointer"
                            onClick={() => handleRowClick(student.id)}
                          >
                            {student.className || '-'}
                          </TableCell>
                          <TableCell
                            className="text-right cursor-pointer"
                            onClick={() => handleRowClick(student.id)}
                          >
                            {stats.totalSolved}
                          </TableCell>
                          <TableCell
                            className="text-right cursor-pointer"
                            onClick={() => handleRowClick(student.id)}
                          >
                            {stats.averageAccuracy.toFixed(1)}%
                          </TableCell>
                           <TableCell
                            className="text-right cursor-pointer"
                            onClick={() => handleRowClick(student.id)}
                          >
                            {stats.totalDuration}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isDeleting === student.id}
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
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteStudent(
                                        student.id,
                                        student.name
                                      )
                                    }
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
