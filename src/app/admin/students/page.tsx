
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc,
  deleteDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Student, StudySession } from '@/lib/types';
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
import { ArrowUpDown, Eye, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { startOfWeek, isAfter, fromUnixTime } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose,
  DialogTrigger
} from '@/components/ui/dialog';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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


const addStudentFormSchema = z.object({
  name: z.string().min(3, { message: 'İsim en az 3 karakter olmalıdır.' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
  className: z.string().optional(),
});


type SortableKeys = 'name' | 'email' | 'className' | 'avgAccuracy' | 'questionsThisWeek';
type SortDirection = 'asc' | 'desc';

interface StudentWithStats extends Student {
    avgAccuracy: number;
    questionsThisWeek: number;
}


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

  const addStudentForm = useForm<z.infer<typeof addStudentFormSchema>>({
    resolver: zodResolver(addStudentFormSchema),
    defaultValues: { name: '', email: '', password: '', className: '' },
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

  const handleAddStudent = async (values: z.infer<typeof addStudentFormSchema>) => {
    setIsSubmitting(true);
    const functions = getFunctions();
    const createStudentAuth = httpsCallable(functions, 'createStudentAuth');

    try {
      // Step 1: Create user in Firebase Auth via Cloud Function
      const result: any = await createStudentAuth({ email: values.email, password: values.password });
      const { uid } = result.data;

      if (!uid) {
        throw new Error("UID alınamadı.");
      }

      // Step 2: Create user and student documents in Firestore using a batch write
      const batch = writeBatch(db);
      
      const userDocRef = doc(db, 'users', uid);
      batch.set(userDocRef, {
        uid: uid,
        email: values.email,
        role: 'student',
      });

      const studentDocRef = doc(db, 'students', uid);
      batch.set(studentDocRef, {
        id: uid,
        name: values.name,
        email: values.email,
        className: values.className || '',
        weeklyQuestionGoal: 100,
        studySessions: [],
        assignments: [],
        resources: [],
        weeklyPlan: [],
        isPlanNew: false,
        unlockedAchievements: [],
        calendarEvents: [],
      });

      await batch.commit();

      toast({ title: 'Başarılı!', description: `${values.name} adlı öğrenci başarıyla eklendi.` });
      addStudentForm.reset();
      await fetchAndProcessStudents();

    } catch (error: any) {
      console.error('Öğrenci eklenirken hata:', error);
      let errorMessage = 'Öğrenci eklenirken bir hata oluştu. Lütfen tekrar deneyin.';
      if (error.code === 'functions/already-exists') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda.';
      } else if (error.code) {
        errorMessage = `Bir hata oluştu: ${error.message}`;
      }
      toast({ title: 'Hata', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    const functions = getFunctions();
    const deleteStudentAuth = httpsCallable(functions, 'deleteStudentAuth');
    try {
        // First, delete from Firestore
        const batch = writeBatch(db);
        const studentDocRef = doc(db, 'students', studentId);
        const userDocRef = doc(db, 'users', studentId);
        batch.delete(studentDocRef);
        batch.delete(userDocRef);
        await batch.commit();

        // Then, delete from Auth
        await deleteStudentAuth({ uid: studentId });

        toast({ title: 'Başarılı!', description: `${studentName} adlı öğrenci silindi.` });
        await fetchAndProcessStudents();
    } catch (error: any) {
        console.error('Öğrenci silinirken hata:', error);
        toast({ title: 'Hata', description: 'Öğrenci silinirken bir sorun oluştu.', variant: 'destructive' });
    }
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
            <Skeleton className="h-10 w-36" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
                        <UserPlus className="mr-2 h-4 w-4" /> Yeni Öğrenci Ekle
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Öğrenci Ekle</DialogTitle>
                        <DialogDescription>
                            Yeni öğrencinin bilgilerini girerek sisteme kaydedin.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...addStudentForm}>
                        <form onSubmit={addStudentForm.handleSubmit(handleAddStudent)} className="space-y-4">
                           <FormField control={addStudentForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>İsim Soyisim</FormLabel>
                                    <FormControl><Input placeholder="Öğrencinin adı" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={addStudentForm.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-posta</FormLabel>
                                    <FormControl><Input type="email" placeholder="ornek@eposta.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={addStudentForm.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Geçici Şifre</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={addStudentForm.control} name="className" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sınıf</FormLabel>
                                    <FormControl><Input placeholder="Örn: 8-A (isteğe bağlı)" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">İptal</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Ekleniyor...' : 'Öğrenciyi Ekle'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
       </div>

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
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/student/${student.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu işlem geri alınamaz. "{student.name}" adlı öğrenciyi, tüm verileriyle birlikte kalıcı olarak sileceksiniz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteStudent(student.id, student.name)}>Sil</AlertDialogAction>
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
