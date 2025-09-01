
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
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
import { ArrowUpDown, Eye, PlusCircle, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { startOfWeek, isAfter, fromUnixTime } from 'date-fns';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';

type SortableKeys = 'name' | 'email' | 'className' | 'avgAccuracy' | 'questionsThisWeek';
type SortDirection = 'asc' | 'desc';

interface StudentWithStats extends Student {
    avgAccuracy: number;
    questionsThisWeek: number;
}

const addStudentFormSchema = z.object({
  name: z.string().min(3, { message: 'İsim en az 3 karakter olmalıdır.' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
  className: z.string().optional(),
});


function AdminStudentsPageContent() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

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
    if (!isAdmin) {
      toast({ title: 'Yetki Hatası', description: 'Bu işlemi sadece adminler yapabilir.', variant: 'destructive' });
      return;
    }
    
    const functions = getFunctions();
    const createStudentFn = httpsCallable(functions, 'createStudent');
    
    toast({ title: 'Öğrenci Ekleniyor...', description: 'Lütfen bekleyin.' });
  
    try {
      const result: any = await createStudentFn(values);
      if (result.data.success) {
        toast({ title: 'Başarılı!', description: 'Öğrenci başarıyla eklendi.' });
        addStudentForm.reset();
        setIsAddStudentOpen(false);
        await fetchAndProcessStudents(); // Refresh the list
      } else {
        throw new Error(result.data.error || 'Bilinmeyen bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Öğrenci eklenirken hata:', error);
      toast({
        title: 'Hata',
        description: error.message || 'Öğrenci eklenirken bir sorun oluştu.',
        variant: 'destructive',
      });
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
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="mr-2 h-4 w-4" /> Yeni Öğrenci Ekle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Öğrenci Ekle</DialogTitle>
                  <DialogDescription>
                    Yeni bir öğrenci hesabı oluşturun ve sisteme dahil edin.
                  </DialogDescription>
                </DialogHeader>
                <Form {...addStudentForm}>
                  <form onSubmit={addStudentForm.handleSubmit(handleAddStudent)} className="space-y-4">
                    <FormField
                      control={addStudentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İsim Soyisim</FormLabel>
                          <FormControl><Input placeholder="Örn: Ahmet Yılmaz" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addStudentForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl><Input placeholder="ornek@eposta.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={addStudentForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlangıç Şifresi</FormLabel>
                          <FormControl><Input type="password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={addStudentForm.control}
                      name="className"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sınıf (İsteğe Bağlı)</FormLabel>
                          <FormControl><Input placeholder="Örn: 12-A" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">İptal</Button>
                        </DialogClose>
                        <Button type="submit" disabled={addStudentForm.formState.isSubmitting}>
                            {addStudentForm.formState.isSubmitting ? 'Ekleniyor...' : 'Öğrenciyi Ekle'}
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
