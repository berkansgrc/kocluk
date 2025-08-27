
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import type { CalendarEvent, Student } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { PlusCircle, Trash2, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const eventFormSchema = z.object({
    title: z.string().min(3, { message: "Not en az 3 karakter olmalıdır." }),
});

interface EventCalendarProps {
    student: Student;
    onUpdate: () => void;
    userRole: 'student' | 'admin';
}

export default function EventCalendar({ student, onUpdate, userRole }: EventCalendarProps) {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof eventFormSchema>>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: { title: '' },
    });

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        student.calendarEvents?.forEach(event => {
            const dateKey = event.date;
            const collection = map.get(dateKey);
            if (!collection) {
                map.set(dateKey, [event]);
            } else {
                collection.push(event);
            }
        });
        return map;
    }, [student.calendarEvents]);

    const modifiers = {
        student: (date: Date) => {
            const dateString = format(date, 'yyyy-MM-dd');
            return !!eventsByDate.get(dateString)?.some(e => e.author === 'student');
        },
        admin: (date: Date) => {
            const dateString = format(date, 'yyyy-MM-dd');
            return !!eventsByDate.get(dateString)?.some(e => e.author === 'admin');
        }
    };

    const modifierStyles = {
        student: {
            color: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary)/0.1)',
        },
        admin: {
            color: 'hsl(var(--accent))',
            backgroundColor: 'hsl(var(--accent)/0.1)',
        },
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsDialogOpen(true);
        form.reset();
    };

    const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
        if (!selectedDate || !student) return;
        setIsSubmitting(true);
        const newEvent: CalendarEvent = {
            id: new Date().toISOString(),
            date: format(selectedDate, 'yyyy-MM-dd'),
            title: values.title,
            author: userRole,
            createdAt: Timestamp.now(),
        };

        try {
            const studentDocRef = doc(db, 'students', student.id);
            await updateDoc(studentDocRef, {
                calendarEvents: arrayUnion(newEvent)
            });
            toast({ title: "Başarılı", description: "Takvim notu eklendi." });
            onUpdate();
            form.reset();
        } catch (error) {
            console.error("Takvim notu eklenirken hata:", error);
            toast({ title: "Hata", description: "Not eklenirken bir sorun oluştu.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteEvent = async (event: CalendarEvent) => {
        if (!student) return;
        try {
            const studentDocRef = doc(db, 'students', student.id);
            await updateDoc(studentDocRef, {
                calendarEvents: arrayRemove(event)
            });
            toast({ title: "Başarılı", description: "Takvim notu silindi." });
            onUpdate();
        } catch (error) {
            console.error("Takvim notu silinirken hata:", error);
            toast({ title: "Hata", description: "Not silinirken bir sorun oluştu.", variant: "destructive" });
        }
    };

    const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
    const eventsForSelectedDay = eventsByDate.get(selectedDateString) || [];

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Çalışma Takvimi</CardTitle>
                    <CardDescription>Hedeflerini ve çalışma notlarını planla. Not eklemek için bir güne tıkla.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        onDayClick={handleDayClick}
                        modifiers={modifiers}
                        modifiersStyles={modifierStyles}
                        locale={tr}
                        className="p-0"
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedDate ? format(selectedDate, 'd MMMM yyyy, cccc', { locale: tr }) : ''}</DialogTitle>
                        <DialogDescription>Bu gün için notlarını görüntüle veya yeni notlar ekle.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {eventsForSelectedDay.length > 0 ? (
                           <ul className='space-y-2 max-h-48 overflow-y-auto pr-2'>
                             {eventsForSelectedDay.sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis()).map(event => (
                                <li key={event.id} className={cn('text-sm p-2 rounded-md flex justify-between items-center group', {
                                    'bg-primary/10': event.author === 'student',
                                    'bg-accent/10': event.author === 'admin'
                                })}>
                                    <div className='flex items-center gap-2'>
                                       {event.author === 'student' ? <User className='w-4 h-4 text-primary' /> : <Shield className='w-4 h-4 text-accent' />}
                                       <span className={cn({
                                          'text-primary-foreground-dark': event.author === 'student', // these might need custom colors
                                          'text-accent-foreground': event.author === 'admin'
                                       })}>{event.title}</span>
                                    </div>
                                    {(userRole === 'admin' || userRole === event.author) && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteEvent(event)}>
                                            <Trash2 className='w-4 h-4 text-destructive' />
                                        </Button>
                                    )}
                                </li>
                             ))}
                           </ul>
                        ) : (
                            <p className='text-sm text-muted-foreground text-center py-4'>Bu tarih için not bulunmuyor.</p>
                        )}
                         <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2 pt-4 border-t">
                            <div className='flex-1'>
                               <Input {...form.register('title')} placeholder="Yeni not ekle..." />
                               {form.formState.errors.title && <p className='text-xs text-destructive mt-1'>{form.formState.errors.title.message}</p>}
                            </div>
                            <Button type="submit" size="sm" disabled={isSubmitting}>
                                <PlusCircle className='w-4 h-4 mr-2' /> Ekle
                            </Button>
                        </form>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Kapat</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
