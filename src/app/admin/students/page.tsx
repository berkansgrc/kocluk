

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
import { ArrowUpDown, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { startOfWeek, isAfter, fromUnixTime } from 'date-fns';

type SortableKeys = 'name' | 'email' | 'className' | 'avgAccuracy' | 'questionsThisWeek';
type SortDirection = 'asc' | 'desc';

interface StudentWithStats extends Student {
    avgAccuracy: number;
    questionsThisWeek: number;
}

function AdminStudentsPageContent() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
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
      <h1 className="text-3xl font-bold tracking-tight font-headline">Tüm Öğrenciler</h1>
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
