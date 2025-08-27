

'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { ExamAnalysis, Subject, ExamResult, ErrorCategory } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { BrainCircuit, ClipboardPen, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { analyzeExam } from '@/ai/flows/exam-analyzer';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ERROR_CATEGORIES } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';

const GRADE_LEVELS = ["5", "6", "7", "8", "9", "10", "11", "12", "YKS"];

const examFormSchema = z.object({
    examName: z.string().min(3, { message: 'Deneme adı en az 3 karakter olmalıdır.' }),
    gradeLevel: z.string({ required_error: 'Lütfen bir sınıf seviyesi seçin.' }),
    subjectId: z.string({ required_error: 'Lütfen bir ders seçin.' }),
    topicResults: z.array(z.object({
        topic: z.string(),
        correct: z.coerce.number().int().min(0).default(0),
        incorrect: z.coerce.number().int().min(0).default(0),
        empty: z.coerce.number().int().min(0).default(0),
    })).min(1, { message: 'Analiz için derse ait en az bir konu olmalıdır.' })
});

type ExamFormValues = z.infer<typeof examFormSchema>;

type MistakeEntry = {
    topic: string;
    category: ErrorCategory | null;
};

function DenemeAnaliziContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [analysis, setAnalysis] = useState<ExamAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false);
    const [mistakeEntries, setMistakeEntries] = useState<MistakeEntry[]>([]);


    const form = useForm<ExamFormValues>({
        resolver: zodResolver(examFormSchema),
        defaultValues: { examName: '', topicResults: [] },
    });

    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "topicResults"
    });

    // Fetch subjects from Firestore
    useEffect(() => {
        const fetchSubjects = async () => {
            setLoadingSubjects(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'subjects'));
                const subjectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
                setSubjects(subjectsList);
            } catch (error) {
                console.error("Dersler alınırken hata:", error);
                toast({ title: "Hata", description: "Ders listesi alınamadı.", variant: "destructive" });
            } finally {
                setLoadingSubjects(false);
            }
        };
        fetchSubjects();
    }, [toast]);
    
    const selectedGradeLevel = form.watch('gradeLevel');
    const selectedSubjectId = form.watch('subjectId');

    const filteredSubjects = useMemo(() => {
        return subjects.filter(s => s.gradeLevel === selectedGradeLevel);
    }, [subjects, selectedGradeLevel]);

    const selectedSubject = useMemo(() => {
        return subjects.find(s => s.id === selectedSubjectId);
    }, [subjects, selectedSubjectId]);

    // Reset subject and topics when grade level changes
    useEffect(() => {
        form.resetField('subjectId');
        replace([]);
    }, [selectedGradeLevel, form, replace]);

    // Update topics when subject changes
    useEffect(() => {
        if (selectedSubject && selectedSubject.topics) {
            replace(selectedSubject.topics.map(topic => ({
                topic: topic.name,
                correct: 0,
                incorrect: 0,
                empty: 0
            })));
        } else {
            replace([]);
        }
    }, [selectedSubject, replace]);


    async function onSubmit(values: ExamFormValues) {
        if (!user || !selectedSubject) return;

        setIsAnalyzing(true);
        setAnalysis(null);
        toast({ title: 'Analiz Başlatıldı', description: 'Yapay zeka deneme sonuçlarınızı inceliyor...' });

        try {
            const analysisInput = {
                studentName: user.displayName || 'Öğrenci',
                examName: values.examName,
                subjectName: selectedSubject.name,
                topicResults: values.topicResults.map(t => ({...t, net: 0, successRate: 0})),
            };
            
            const result = await analyzeExam(analysisInput);
            setAnalysis(result);
            toast({ title: 'Analiz Tamamlandı!', description: 'Sonuçları aşağıda görebilirsiniz. Şimdi hatalarınızı kategorize edebilirsiniz.' });

            // Prepare for mistake analysis
            const topicsWithMistakes = values.topicResults
                .filter(t => t.incorrect > 0 || t.empty > 0)
                .map(t => ({ topic: t.topic, category: null } as MistakeEntry));
            
            setMistakeEntries(topicsWithMistakes);

            if(topicsWithMistakes.length > 0) {
              setTimeout(() => setIsMistakeModalOpen(true), 500); // Open modal after a short delay
            } else {
              await saveResults(result, values, {});
            }

        } catch (error) {
            console.error("Exam analysis error:", error);
            toast({ title: 'Analiz Hatası', description: 'Sonuçlar analiz edilirken bir sorun oluştu.', variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    }

    const handleMistakeCategoryChange = (index: number, category: ErrorCategory) => {
        setMistakeEntries(prev => {
            const newEntries = [...prev];
            newEntries[index].category = category;
            return newEntries;
        });
    };
    
    const saveResults = async (currentAnalysis: ExamAnalysis, formValues: ExamFormValues, categorizedMistakes: Record<ErrorCategory, number>) => {
        if (!user || !selectedSubject || !currentAnalysis) return;

        const finalResult: ExamResult = {
            ...currentAnalysis,
            userId: user.uid,
            examName: formValues.examName,
            subjectName: selectedSubject.name,
            gradeLevel: formValues.gradeLevel,
            analyzedAt: Timestamp.now(),
            topicResults: formValues.topicResults.map(({ topic, correct, incorrect, empty }) => ({ topic, correct, incorrect, empty })),
            errorAnalysis: categorizedMistakes,
        };

        try {
            await addDoc(collection(db, "examResults"), finalResult);
            toast({
                title: "Sonuçlar Kaydedildi!",
                description: "Hata analiz raporunuz oluşturuldu. Raporu Hata Raporu sayfasından görüntüleyebilirsiniz.",
            });
            router.push('/hata-raporu');
        } catch (error) {
            console.error("Error saving results: ", error);
            toast({ title: "Kayıt Hatası", description: "Analiz sonuçları kaydedilirken bir hata oluştu.", variant: "destructive" });
        }
    };

    const handleFinishMistakeAnalysis = async () => {
        if (!analysis || !form.getValues()) return;

        const categorizedMistakes = mistakeEntries.reduce((acc, entry) => {
            if (entry.category) {
                acc[entry.category] = (acc[entry.category] || 0) + 1;
            }
            return acc;
        }, {} as Record<ErrorCategory, number>);
        
        await saveResults(analysis, form.getValues(), categorizedMistakes);

        setIsMistakeModalOpen(false);
    };


    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Dialog open={isMistakeModalOpen} onOpenChange={setIsMistakeModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Hatalarını Analiz Et</DialogTitle>
                  <DialogDescription>
                    Yanlışlarının veya boşlarının temel nedenini seçerek en zayıf noktalarını keşfet. Bu, sana özel raporlar oluşturmamıza yardımcı olacak.
                  </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                        {mistakeEntries.map((entry, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                                <p className="font-semibold mb-2">{entry.topic}</p>
                                <p className="text-sm text-muted-foreground mb-3">Bu konudaki hatanın nedeni neydi?</p>
                                <RadioGroup
                                    onValueChange={(value) => handleMistakeCategoryChange(index, value as ErrorCategory)}
                                    className="gap-2"
                                >
                                    {Object.entries(ERROR_CATEGORIES).map(([key, value]) => (
                                        <FormItem key={key} className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={key} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{value}</FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </div>
                        ))}
                    </div>
                </Form>
                <DialogFooter>
                   <Button onClick={handleFinishMistakeAnalysis} disabled={mistakeEntries.some(e => e.category === null)}>
                      Analizi Bitir ve Kaydet
                   </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Deneme Analizi</h1>
                <p className="text-muted-foreground">Deneme sınavı sonuçlarını konu bazında girerek detaylı analiz ve kişiselleştirilmiş geri bildirimler al.</p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deneme Bilgileri</CardTitle>
                            <CardDescription>Analiz etmek istediğin denemenin bilgilerini ve konu sonuçlarını gir.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="examName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Deneme Adı</FormLabel>
                                                <FormControl><Input placeholder="Örn: TYT Genel Deneme 3" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="gradeLevel"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Sınıf Seviyesi</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Bir seviye seçin" />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                    {GRADE_LEVELS.map(level => (
                                                        <SelectItem key={level} value={level}>{level === 'YKS' ? 'YKS' : `${level}. Sınıf`}</SelectItem>
                                                    ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subjectId"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Ders</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGradeLevel || loadingSubjects}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={loadingSubjects ? "Yükleniyor..." : !selectedGradeLevel ? "Önce seviye seçin" : "Bir ders seçin"} />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                    {filteredSubjects.map(subject => (
                                                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                                    ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Konu Sonuçları</h3>
                                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="p-4 border rounded-md space-y-3 bg-muted/20">
                                                <FormLabel className="font-medium">{field.topic}</FormLabel>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <FormField control={form.control} name={`topicResults.${index}.correct`} render={({ field }) => (<FormItem><FormLabel>Doğru</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                                    <FormField control={form.control} name={`topicResults.${index}.incorrect`} render={({ field }) => (<FormItem><FormLabel>Yanlış</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                                    <FormField control={form.control} name={`topicResults.${index}.empty`} render={({ field }) => (<FormItem><FormLabel>Boş</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                                </div>
                                            </div>
                                        ))}
                                        {selectedSubjectId && fields.length === 0 && (
                                            <p className='text-sm text-muted-foreground text-center py-4'>Bu derse ait konu bulunamadı. Lütfen kütüphaneden ekleyin.</p>
                                        )}
                                        </div>
                                        {form.formState.errors.topicResults?.root && <p className='text-sm font-medium text-destructive'>{form.formState.errors.topicResults.root.message}</p>}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isAnalyzing || !selectedSubjectId || fields.length === 0}>
                                        {isAnalyzing ? 'Analiz Ediliyor...' : <><BrainCircuit className="mr-2" /> Analiz Yap</>}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card className="min-h-full sticky top-20">
                        <CardHeader>
                            <CardTitle>Yapay Zeka Analiz Sonucu</CardTitle>
                            <CardDescription>Sonuçların burada detaylı bir şekilde gösterilecek.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isAnalyzing ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-8 w-1/2" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Separator className="my-4" />
                                    <Skeleton className="h-6 w-1/4" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : analysis ? (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold">Genel Değerlendirme</h3>
                                        <div className='flex items-center gap-6 mt-2'>
                                            <div className='text-center p-4 bg-muted/40 rounded-lg'>
                                                <p className='text-2xl font-bold text-primary'>{analysis.overallNet.toFixed(2)}</p>
                                                <p className='text-sm text-muted-foreground'>Genel Net</p>
                                            </div>
                                            <div className='text-center p-4 bg-muted/40 rounded-lg'>
                                                <p className='text-2xl font-bold text-primary'>{analysis.overallSuccessRate.toFixed(2)}%</p>
                                                <p className='text-sm text-muted-foreground'>Genel Başarı</p>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm text-foreground/80">{analysis.generalFeedback}</p>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="text-emerald-500" /> Güçlü Olduğun Konular</h3>
                                            <div className='mt-2 flex flex-col items-start gap-1'>
                                                {analysis.strengths.length > 0 ? analysis.strengths.map(topic => (
                                                    <Badge key={topic} variant="secondary" className='bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-left h-auto whitespace-normal'>{topic}</Badge>
                                                )) : <p className='text-sm text-muted-foreground'>Belirgin bir güçlü konu bulunamadı.</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingDown className="text-destructive" /> Odaklanman Gereken Konular</h3>
                                            <div className="mt-2 space-y-4">
                                                {analysis.weaknesses.map(weakness => (
                                                    <div key={weakness.topic} className='p-3 border-l-4 border-amber-500 bg-amber-500/10 rounded-r-md'>
                                                        <p className="font-semibold text-amber-900">{weakness.topic}</p>
                                                        <p className="text-sm text-amber-800 mt-1">{weakness.suggestion}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center h-full min-h-80 text-muted-foreground">
                                    <ClipboardPen className="w-16 h-16 mb-4" />
                                    <p>Analize başlamak için lütfen deneme bilgilerini ve konu sonuçlarını gir.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function DenemeAnaliziPage() {
    return (
        <AppLayout>
            <DenemeAnaliziContent />
        </AppLayout>
    );
}
