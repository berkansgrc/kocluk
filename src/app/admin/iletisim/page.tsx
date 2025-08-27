
'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { ContactSubmission } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MailQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

function IletisimPageContent() {
    const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            // Güvenlik kurallarının doğru çalışması için sorguyu basitleştiriyoruz.
            // Firestore, bu isteği yapan kullanıcının yönetici olup olmadığını kurallar üzerinden denetleyecektir.
            const submissionsQuery = query(collection(db, 'contactSubmissions'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(submissionsQuery);
            const submissionsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ContactSubmission));
            setSubmissions(submissionsList);
        } catch (error) {
            console.error('İletişim talepleri getirilirken hata:', error);
            toast({
                title: 'Hata',
                description: 'İletişim talepleri alınamadı. Lütfen izinlerinizi kontrol edin.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div>
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-80 mt-2" />
                </div>
                <Card className='mt-6'>
                    <CardHeader>
                        <Skeleton className='h-6 w-48' />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className='h-48 w-full' />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">
                        İletişim Talepleri
                    </h1>
                    <p className="text-muted-foreground">
                        Web sitesi üzerinden gönderilen iletişim formu taleplerinin listesi.
                    </p>
                </div>

                <Card className='mt-6'>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <MailQuestion /> Gelen Talepler
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>İsim Soyisim</TableHead>
                                        <TableHead>Telefon Numarası</TableHead>
                                        <TableHead>Tarih</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">
                                                Henüz bir iletişim talebi yok.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        submissions.map(submission => (
                                            <TableRow key={submission.id}>
                                                <TableCell className="font-medium">{submission.name}</TableCell>
                                                <TableCell>{submission.phone}</TableCell>
                                                <TableCell>
                                                    {format(submission.createdAt.toDate(), 'PPP, p', { locale: tr })}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}


export default function IletisimPage() {
    return (
        <IletisimPageContent />
    )
}
