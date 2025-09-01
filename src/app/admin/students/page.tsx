
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs,
  doc,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/app-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Eye, Info, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { startOfWeek, isAfter, fromUnixTime } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from '@/components/ui/dialog';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


type SortableKeys = 'name' | 'email' | 'className' | 'avgAccuracy' | 'questionsThisWeek';
type SortDirection = 'asc' | 'desc';

interface StudentWithStats extends Student {
    avgAccuracy: number;
    questionsThisWeek: number;
}

const addStudentFormSchema = z.object({
  uid: z.string().min(10, { message: 'Lütfen geçerli bir Firebase UID girin.'}),
  name: z.string().min(3, { message: 'İsim en az 3 karakter olmalıdır.' }),
  email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  className: z.string().optional(),
});


function AdminStudentsPageContent() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

  const form = useForm<z.infer<typeof addStudentFormSchema>>({
    resolver: zodResolver(addStudentFormSchema),
    defaultValues: { uid: '', name: '', email: '', className: '' },
  });

  const fetchAndProcessStudents = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      let studentsList = querySnapshot.docs.map(doc => {
        const student = { id: doc.id, ...doc.data() } as Student;
        const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
        
        let totalCorrect = 0;
        let totalSolved = 0;
        let questionsThisWeek = 0;

        (student.studySessions || []).forEach(session => {
            const sessionDate = session.date?.seconds ? fromUnixTime(session.date.seconds) : new Date(session.date);
            if (!(sessionDate instanceof Date && !isNaN(sessionDate.valueOf()))) return;

            totalCorrect += session.questionsCorrect;
            totalSolved += session.questionsSolved;

            if (isAfter(sessionDate, startOfThisWeek)) {
                questionsThisWeek += session.questionsSolved;
            }
        });
        
        return {
            ...student,
            avgAccuracy: totalSolved > 0 ? (totalCorrect / totalSolved) * 100 : 0,
            questionsThisWeek,
        } as StudentWithStats;
      });

      setStudents(studentsList);
    } catch (error) {
      console.error('Öğrenciler getirilirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Öğrenci listesi alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAndProcessStudents();
  }, [fetchAndProcessStudents]);
  
  const handleAddStudent = async (values: z.infer<typeof addStudentFormSchema>) => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      // 1. Create user role document
      const userDocRef = doc(db, 'users', values.uid);
      batch.set(userDocRef, {
        email: values.email,
        role: 'student',
        uid: values.uid,
      });

      // 2. Create student profile document
      const studentDocRef = doc(db, 'students', values.uid);
      batch.set(studentDocRef, {
        name: values.name,
        email: values.email,
        className: values.className || '',
        weeklyQuestionGoal: 100, // Default value
        studySessions: [],
        assignments: [],
        resources: [],
        weeklyPlan: [],
        unlockedAchievements: [],
        calendarEvents: [],
      });

      await batch.commit();

      toast({
        title: 'Başarılı!',
        description: `${values.name} adlı öğrencinin veritabanı kayıtları oluşturuldu.`,
      });
      form.reset();
      fetchAndProcessStudents(); // Refresh the list
      
    } catch (error: any) {
        console.error("Error adding student records:", error);
        toast({
            title: "Veritabanı Hatası",
            description: "Öğrenci kayıtları oluşturulurken bir hata oluştu. Firestore kurallarınızı kontrol edin.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteStudent = async (student: StudentWithStats) => {
    try {
        const batch = writeBatch(db);

        const userDocRef = doc(db, "users", student.id);
        batch.delete(userDocRef);

        const studentDocRef = doc(db, "students", student.id);
        batch.delete(studentDocRef);

        await batch.commit();

        toast({
            title: 'Başarılı!',
            description: `${student.name} adlı öğrencinin veritabanı kayıtları silindi.`,
        });
        fetchAndProcessStudents(); // Refresh list
    } catch (error) {
        console.error("Öğrenci kayıtları silinirken hata:", error);
        toast({
            title: "Veritabanı Hatası",
            description: "Öğrenci kayıtları silinirken bir hata oluştu.",
            variant: "destructive",
        });
    }
  };


  const classNames = useMemo(() => ['all', ...Array.from(new Set(students.map(s => s.className).filter(Boolean)))], [students]);

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter(student =>
      (student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (classFilter === 'all' || student.className === classFilter)
    );

    if (sortConfig) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [students, searchTerm, classFilter, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader = ({ sortKey, label, className }: { sortKey: SortableKeys, label: string, className?: string }) => (
    <TableHead className={className}>
        <Button variant="ghost" onClick={() => requestSort(sortKey)}>
            {label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-48" />
            </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline">Tüm Öğrenciler</h1>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Yeni Öğrenci Ekle
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Öğrenci Veritabanı Kaydı</DialogTitle>
                        <DialogDescription>
                            Önce Firebase konsolundan kullanıcıyı oluşturun, sonra buraya UID ve diğer bilgileri girin.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAddStudent)} className="space-y-4">
                            <FormField control={form.control} name="uid" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kullanıcı UID</FormLabel>
                                    <FormControl><Input placeholder="Firebase Auth'tan gelen UID" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>İsim Soyisim</FormLabel>
                                    <FormControl><Input placeholder="Öğrencinin adı" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-posta</FormLabel>
                                    <FormControl><Input type="email" placeholder="ornek@eposta.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="className" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sınıf</FormLabel>
                                    <FormControl><Input placeholder="Örn: 8-A (isteğe bağlı)" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">İptal</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Ekleniyor...' : 'Öğrenci Kaydı Oluştur'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
       </div>

       <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Öğrenci Ekleme/Silme İşlemleri</AlertTitle>
        <AlertDescription>
          Güvenlik ve stabilite nedeniyle, kullanıcı hesapları (Authentication) <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">Firebase Konsolu</a> üzerinden yönetilmelidir. Buradaki arayüz sadece Firestore veritabanı kayıtlarını yönetir.
        </AlertDescription>
       </Alert>

      <div className="flex items-center gap-4">
        <Input
          placeholder="İsim veya e-posta ile ara..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sınıfa göre filtrele" />
          </SelectTrigger>
          <SelectContent>
            {classNames.map(name => (
              <SelectItem key={name} value={name}>{name === 'all' ? 'Tüm Sınıflar' : name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKey="name" label="İsim Soyisim" />
              <SortableHeader sortKey="email" label="E-posta" />
              <SortableHeader sortKey="className" label="Sınıf" />
              <SortableHeader sortKey="avgAccuracy" label="Ortalama Başarı" />
              <SortableHeader sortKey="questionsThisWeek" label="Soru (Haftalık)" />
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedStudents.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.className || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={cn({
                    'bg-emerald-100 text-emerald-800 hover:bg-emerald-200': student.avgAccuracy >= 85,
                    'bg-amber-100 text-amber-800 hover:bg-amber-200': student.avgAccuracy >= 60 && student.avgAccuracy < 85,
                    'bg-red-100 text-red-800 hover:bg-red-200': student.avgAccuracy < 60,
                  })}>
                    {student.avgAccuracy.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell>{student.questionsThisWeek}</TableCell>
                <TableCell className='flex items-center'>
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/student/${student.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Veritabanı Kayıtlarını Sil?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. "{student.name}" adlı öğrencinin <span className='font-bold'>users</span> ve <span className='font-bold'>students</span> koleksiyonlarındaki kayıtları kalıcı olarak silinecektir. Authentication kaydını konsoldan silmeyi unutmayın.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteStudent(student)}>
                            Sil
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
    return (
        <AppLayout>
            <AdminStudentsPageContent />
        </AppLayout>
    )
}

    