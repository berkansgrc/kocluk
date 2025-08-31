
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import type { Student, Teacher, AppUser, Subject } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Pencil, Check, X, UserCog, Users, School } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';

type UserData = (Omit<AppUser, 'uid'> & { id: string, name: string });

const userFormSchema = z.object({
  name: z.string().min(3, { message: 'İsim en az 3 karakter olmalıdır.' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
  role: z.enum(['student', 'teacher'], { required_error: 'Bir rol seçmek zorunludur.' }),
});


function AdminUsersPageContent() {
    const { toast } = useToast();
    const functions = getFunctions();
    const createUser = httpsCallable(functions, 'createUser');

    const [users, setUsers] = useState<UserData[]>([]);
    const [allClasses, setAllClasses] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userForm = useForm<z.infer<typeof userFormSchema>>({
        resolver: zodResolver(userFormSchema),
        defaultValues: { name: '', email: '', password: '', role: 'student' },
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersList = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
            
            const studentsSnapshot = await getDocs(collection(db, 'students'));
            const studentsMap = new Map(studentsSnapshot.docs.map(d => [d.id, d.data() as Student]));
            
            const teachersSnapshot = await getDocs(collection(db, 'teachers'));
            const teachersMap = new Map(teachersSnapshot.docs.map(d => [d.id, d.data() as Teacher]));

            const combinedUsers: UserData[] = usersList.map(user => {
                let name = 'Bilinmeyen';
                if (user.role === 'student' && studentsMap.has(user.uid)) {
                    name = studentsMap.get(user.uid)!.name;
                } else if (user.role === 'teacher' && teachersMap.has(user.uid)) {
                    name = teachersMap.get(user.uid)!.name;
                }
                return { id: user.uid, name, ...user };
            });

            const uniqueClasses = Array.from(new Set(studentsSnapshot.docs.map(d => (d.data() as Student).className).filter(Boolean)));
            setAllClasses(uniqueClasses as string[]);
            setUsers(combinedUsers);
        } catch (error) {
            console.error('Kullanıcılar getirilirken hata:', error);
            toast({ title: 'Hata', description: 'Kullanıcılar alınamadı.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    async function handleUserSubmit(values: z.infer<typeof userFormSchema>) {
        setIsSubmitting(true);
        try {
            const result: any = await createUser(values);

            if (result.data.error) {
                throw new Error(result.data.error.message || 'Kullanıcı oluşturulamadı.');
            }
            
            toast({ title: 'Başarılı!', description: 'Yeni kullanıcı başarıyla oluşturuldu ve veritabanına eklendi.' });
            userForm.reset();
            await fetchUsers();

        } catch (error: any) {
            console.error('Kullanıcı oluşturulurken hata:', error);
            const errorMessage = error.message.includes('auth/email-already-exists')
                ? 'Bu e-posta adresi zaten kullanımda.'
                : 'Kullanıcı oluşturulurken bir hata oluştu.';
            toast({ title: 'Hata', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUpdateTeacherClasses(teacherId: string, newClasses: string[]) {
        try {
            const teacherDocRef = doc(db, 'teachers', teacherId);
            const userDocRef = doc(db, 'users', teacherId);
            const batch = writeBatch(db);
            batch.update(teacherDocRef, { assignedClasses: newClasses });
            batch.update(userDocRef, { assignedClasses: newClasses });
            await batch.commit();

            toast({ title: 'Başarılı!', description: 'Öğretmenin sorumlu olduğu sınıflar güncellendi.'});
            await fetchUsers();

        } catch (error) {
            console.error('Öğretmen sınıfları güncellenirken hata:', error);
            toast({ title: 'Hata', description: 'Sınıflar güncellenemedi.', variant: 'destructive' });
        }
    }

    async function handleDeleteUser(userId: string, role: 'student' | 'teacher') {
        const deleteUser = httpsCallable(functions, 'deleteUser');
        try {
            await deleteUser({ uid: userId, role });
            toast({ title: 'Başarılı!', description: 'Kullanıcı başarıyla sistemden silindi.'});
            await fetchUsers();
        } catch (error) {
             console.error('Kullanıcı silinirken hata:', error);
             toast({ title: 'Hata', description: 'Kullanıcı silinemedi.', variant: 'destructive' });
        }
    }

    if (loading) {
        return <div className="p-8"><Skeleton className="h-96 w-full" /></div>
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">Kullanıcı Yönetimi</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Yeni Kullanıcı Ekle</CardTitle>
                        <CardDescription>Yeni bir öğrenci veya öğretmen oluşturun.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...userForm}>
                            <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
                                <FormField control={userForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>İsim Soyisim</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={userForm.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={userForm.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Şifre</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={userForm.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rol</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Rol seçin" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="student">Öğrenci</SelectItem>
                                                <SelectItem value="teacher">Öğretmen</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Mevcut Kullanıcılar</CardTitle>
                        <CardDescription>Sistemdeki tüm öğretmen ve öğrencileri yönetin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>İsim Soyisim</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Atanan Sınıflar</TableHead>
                                    <TableHead className="text-right">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.filter(u => u.role !== 'admin').map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className='font-medium'>{user.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'teacher' ? 'secondary' : 'outline'}>
                                                {user.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === 'teacher' && (
                                                <ClassSelector
                                                    allClasses={allClasses}
                                                    assignedClasses={user.assignedClasses || []}
                                                    onSave={(newClasses) => handleUpdateTeacherClasses(user.id, newClasses)}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Bu işlem geri alınamaz. "{user.name}" adlı kullanıcıyı, tüm verileriyle birlikte kalıcı olarak sileceksiniz.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.role as 'student'|'teacher')}>Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}

function ClassSelector({ allClasses, assignedClasses, onSave }: { allClasses: string[], assignedClasses: string[], onSave: (newClasses: string[]) => void }) {
    const [selected, setSelected] = useState<string[]>(assignedClasses);
    const [open, setOpen] = useState(false);

    const handleSave = () => {
        onSave(selected);
        setOpen(false);
    }
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[180px] justify-start">
                    <School className="mr-2 h-4 w-4" />
                    {assignedClasses.length} sınıf seçili
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Sınıf ara..." />
                    <CommandList>
                        <CommandEmpty>Sınıf bulunamadı.</CommandEmpty>
                        <CommandGroup>
                            {allClasses.map((className) => (
                                <CommandItem
                                    key={className}
                                    onSelect={() => {
                                        const isSelected = selected.includes(className);
                                        if (isSelected) {
                                            setSelected(selected.filter((c) => c !== className));
                                        } else {
                                            setSelected([...selected, className]);
                                        }
                                    }}
                                >
                                    <div
                                        className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        selected.includes(className) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                        )}
                                    >
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <span>{className}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
                <div className='p-2 border-t flex justify-end gap-2'>
                    <Button variant="ghost" size="sm" onClick={() => { setSelected(assignedClasses); setOpen(false); }}>İptal</Button>
                    <Button size="sm" onClick={handleSave}>Kaydet</Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default function AdminUsersPage() {
    return (
        <AppLayout>
            <AdminUsersPageContent />
        </AppLayout>
    )
}

