
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
import { AreaChart, BadgePercent, GraduationCap, Trash2, UserPlus, Users, Eye, ArrowUpDown } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
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
import { AppLayout } from '@/components/app-layout';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.' }),
  email: z
    .string()
    .email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
  className: z.string().optional(),
});

type SortableField = 'name' | 'className' | 'totalSolved' | 'averageAccuracy' | 'totalDuration';

function AdminPageContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableField; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc'});


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
    let studentUser;
  
    try {
      const { initializeApp, deleteApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      
      const tempAppName = `student-auth-${Date.now()}`;
      const tempApp = initializeApp(auth.app.options, tempAppName);
      const tempAuth = getAuth(tempApp);
      
      const studentUserCredential = await createUserWithEmailAndPassword(tempAuth, values.email, values.password);
      studentUser = studentUserCredential.user;
      await deleteApp(tempApp);

      const batch = writeBatch(db);

      const studentDocRef = doc(db, 'students', studentUser.uid);
      batch.set(studentDocRef, {
        name: values.name,
        email: values.email,
        className: values.className || '',
        weeklyQuestionGoal: 100,
        studySessions: [],
        assignments: [],
      });

      const studentUserDocRef = doc(db, 'users', studentUser.uid);
      batch.set(studentUserDocRef, {
        uid: studentUser.uid,
        email: values.email,
        role: 'student',
      });

      await batch.commit();
  
      toast({
        title: 'Öğrenci Eklendi!',
        description: `${values.name} başarıyla oluşturuldu.`,
      });
  
      studentForm.reset();
      fetchStudents();
  
    } catch (error: any) {
      console.error('Öğrenci eklenirken hata: ', error);
      let errorMessage = 'Kullanıcı oluşturulurken bir sorun oluştu.';
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

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    setIsDeleting(studentId);
    try {
      await deleteDoc(doc(db, 'students', studentId));
      await deleteDoc(doc(db, 'users', studentId));
      
      toast({
        title: 'Öğrenci Silindi',
        description: `${studentName} adlı öğrencinin tüm verileri başarıyla silindi. Lütfen Firebase Authentication'dan da kullanıcıyı manuel olarak silmeyi unutmayın.`,
      });
      fetchStudents(); 
    } catch (error) {
      console.error('Öğrenci silinirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Öğrenci silinirken bir sorun oluştu.',
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

  const classNames = useMemo(() => ['all', ...Array.from(new Set(students.map(s => s.className).filter(Boolean)))], [students]);

  const filteredAndSortedStudents = useMemo(() => {
    let result = students.map(s => ({...s, ...getStudentStats(s)}));

    // Filtering
    if (searchTerm) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (classFilter !== 'all') {
      result = result.filter(s => s.className === classFilter);
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [students, searchTerm, classFilter, sortConfig]);

  const requestSort = (key: SortableField) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader = ({ sortKey, label, className }: { sortKey: SortableField, label: string, className?: string }) => (
     <TableHead className={className}>
        <Button variant="ghost" onClick={() => requestSort(sortKey)}>
            {label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
     </TableHead>
  )


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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              Sisteme yeni bir öğrenci hesabı kaydedin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...studentForm}>
              <form
                onSubmit={studentForm.handleSubmit(onStudentSubmit)}
                className="space-y-6"
              >
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
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
                
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
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
                </CardDescription>
              </div>
            </div>
             <div className="flex items-center gap-4 mt-4">
                <Input 
                    placeholder="İsim veya e-posta ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className='w-[180px]'>
                        <SelectValue placeholder="Sınıfa göre filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                        {classNames.map(name => (
                            <SelectItem key={name} value={name}>{name === 'all' ? 'Tüm Sınıflar' : name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader sortKey='name' label='İsim Soyisim' />
                    <TableHead className="hidden md:table-cell">E-posta</TableHead>
                    <SortableHeader sortKey='className' label='Sınıf' className='hidden sm:table-cell'/>
                    <SortableHeader sortKey='totalSolved' label='Toplam Çözülen' className='text-right hidden lg:table-cell'/>
                    <SortableHeader sortKey='averageAccuracy' label='Ort. Başarı' className='text-right hidden lg:table-cell'/>
                    <SortableHeader sortKey='totalDuration' label='Toplam Süre (dk)' className='text-right hidden lg:table-cell'/>
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
                  ) : filteredAndSortedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Sonuç bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedStudents.map((student) => {
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{student.name}</span>
                              <span className="text-muted-foreground text-sm md:hidden">{student.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {student.email}
                          </TableCell>
                           <TableCell className="hidden sm:table-cell">
                            {student.className || '-'}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell">
                            {student.totalSolved}
                          </TableCell>
                          <TableCell className="text-right hidden lg:table-cell">
                             <Badge
                                className={cn("text-xs font-semibold", {
                                'bg-emerald-100 text-emerald-800 hover:bg-emerald-200': student.averageAccuracy >= 90,
                                'bg-red-100 text-red-800 hover:bg-red-200': student.averageAccuracy < 70,
                                })}
                                variant={student.averageAccuracy >= 70 && student.averageAccuracy < 90 ? 'secondary' : 'default'}
                            >
                                {student.averageAccuracy.toFixed(1)}%
                            </Badge>
                          </TableCell>
                           <TableCell className="text-right hidden lg:table-cell">
                            {student.totalDuration}
                          </TableCell>
                          <TableCell className="text-right">
                             <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRowClick(student.id)}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
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
                                    onClick={() => handleDeleteStudent(
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


export default function AdminPage() {
    return (
        <AppLayout>
            <AdminPageContent />
        </AppLayout>
    )
}

    