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
import { UserPlus, Users } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  setDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState, useCallback } from 'react';
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


const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.' }),
  email: z
    .string()
    .email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function AdminPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
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

  async function onStudentSubmit(values: z.infer<typeof studentFormSchema>) {
    setIsSubmitting(true);
    try {
      // Create user in Firebase Auth
      // NOTE: This approach has limitations. It uses a secondary, temporary Firebase app instance
      // to create a user without signing the admin out. This is a workaround for not having a backend.
      const {initializeApp} = await import('firebase/app');
      const {getAuth} = await import('firebase/auth');

      const tempAppName = `temp-app-${Date.now()}`;
      const tempApp = initializeApp(auth.app.options, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        tempAuth,
        values.email,
        values.password
      );
      const newStudentUser = userCredential.user;

      // Save student data in Firestore with the UID as the document ID
      const studentDocRef = doc(db, 'students', newStudentUser.uid);
      await setDoc(studentDocRef, {
        name: values.name,
        email: values.email,
        weeklyQuestionGoal: 100, // Default goal
        studySessions: [],
        assignments: [],
      });

      toast({
        title: 'Öğrenci Eklendi!',
        description: `${values.name} adlı öğrenci başarıyla oluşturuldu. Belirlediğiniz şifre ile giriş yapabilir.`,
      });

      studentForm.reset();
      fetchStudents(); // Refresh the list
    } catch (error: any) {
      console.error('Öğrenci eklenirken hata: ', error);
      let errorMessage = 'Öğrenci oluşturulurken bir sorun oluştu.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.';
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

  const getStudentStats = (student: Student) => {
    const totalSolved = student.studySessions?.reduce((acc, s) => acc + s.questionsSolved, 0) || 0;
    const totalCorrect = student.studySessions?.reduce((acc, s) => acc + s.questionsCorrect, 0) || 0;
    const totalDuration = student.studySessions?.reduce((acc, s) => acc + s.durationInMinutes, 0) || 0;
    const averageAccuracy = totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0;
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
            Uygulama verilerini ve ayarlarını yönetin.
          </p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6">
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                   {isSubmitting ? 'Ekleniyor...' : (
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
            <CardTitle className="flex items-center gap-2">
              <Users /> Kayıtlı Öğrenciler
            </CardTitle>
            <CardDescription>
              Sistemde kayıtlı olan tüm öğrencilerin listesi ve durumları. Detaylar için bir öğrenciye tıklayın.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İsim Soyisim</TableHead>
                    <TableHead>E-posta Adresi</TableHead>
                    <TableHead className="text-right">Toplam Çözülen</TableHead>
                    <TableHead className="text-right">Ortalama Başarı</TableHead>
                    <TableHead className="text-right">Toplam Süre (dk)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Yükleniyor...
                      </TableCell>
                    </TableRow>
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Kayıtlı öğrenci bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => {
                      const stats = getStudentStats(student);
                      return (
                        <TableRow key={student.id} onClick={() => handleRowClick(student.id)} className="cursor-pointer">
                          <TableCell className="font-medium">
                            {student.name}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell className="text-right">{stats.totalSolved}</TableCell>
                          <TableCell className="text-right">{stats.averageAccuracy.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{stats.totalDuration}</TableCell>
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
