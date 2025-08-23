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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Send, UserPlus, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { addDoc, collection, getDocs } from 'firebase/firestore';
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

const docFormSchema = z.object({
  studentName: z.string({ required_error: 'Lütfen bir öğrenci seçin.' }),
  documentUrl: z.string().url({ message: 'Lütfen geçerli bir URL girin.' }),
});

const studentFormSchema = z.object({
  name: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.'}),
  email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
});


export default function AdminPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const docForm = useForm<z.infer<typeof docFormSchema>>({
    resolver: zodResolver(docFormSchema),
    defaultValues: {
      documentUrl: '',
    },
  });
  
  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "students"));
      const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
    } catch (error) {
      console.error("Öğrenciler getirilirken hata:", error);
      toast({
        title: 'Hata',
        description: 'Öğrenci listesi alınamadı. Firestore kurallarınızı kontrol edin.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);


  function onDocSubmit(values: z.infer<typeof docFormSchema>) {
    console.log('Döküman gönderildi:', values);
    toast({
      title: 'Döküman Gönderildi!',
      description: `${values.studentName} adlı öğrenciye döküman başarıyla gönderildi.`,
    });
    docForm.reset();
  }

  async function onStudentSubmit(values: z.infer<typeof studentFormSchema>) {
    try {
      // It's better to create student document with a specific ID if possible, 
      // but for now, Firestore will autogenerate it.
      // The signup logic will need to handle this.
      await addDoc(collection(db, "students"), {
        name: values.name,
        email: values.email,
        // Default values for a new student pre-registration
        weeklyQuestionGoal: 100, 
        studySessions: [],
      });
      toast({
        title: 'Öğrenci Eklendi!',
        description: `${values.name} adlı öğrenci başarıyla eklendi. Bu öğrenci artık kayıt olabilir.`,
      });
      studentForm.reset();
      fetchStudents(); // Refresh the list
    } catch (error) {
      console.error("Öğrenci eklenirken hata: ", error);
      toast({
        title: 'Hata',
        description: 'Öğrenci eklenirken bir sorun oluştu.',
        variant: 'destructive',
      });
    }
  }

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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><UserPlus/> Yeni Öğrenci Ekle</CardTitle>
            <CardDescription>
              Sisteme yeni bir öğrenci kaydedin. Sadece kayıtlı öğrenciler giriş yapabilir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...studentForm}>
              <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-6">
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
                <Button type="submit" className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" /> Öğrenciyi Ekle
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><Send/> Döküman Gönder</CardTitle>
            <CardDescription>
              Öğrencilere Google Drive döküman bağlantıları gönderin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...docForm}>
              <form onSubmit={docForm.handleSubmit(onDocSubmit)} className="space-y-6">
                <FormField
                  control={docForm.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Öğrenci</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loading ? "Yükleniyor..." : "Bir öğrenci seçin"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={docForm.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Drive Linki</FormLabel>
                      <FormControl>
                        <Input placeholder="https://docs.google.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  <Send className="mr-2 h-4 w-4" /> Gönder
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
       <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'><Users/> Kayıtlı Öğrenciler</CardTitle>
          <CardDescription>
            Sistemde kayıtlı olan tüm öğrencilerin listesi.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İsim Soyisim</TableHead>
                  <TableHead>E-posta Adresi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                     Kayıtlı öğrenci bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
