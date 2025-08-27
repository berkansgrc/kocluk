
'use client';

import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { ExamResult, MistakeAnalysis, ErrorCategory } from '@/lib/types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ListChecks, HelpCircle, AlertCircle, TrendingDown, TrendingUp, Lightbulb } from 'lucide-react';
import { DonutChart } from '@tremor/react';
import { ERROR_CATEGORIES } from '@/lib/types';
import { analyzeMistakes } from '@/ai/flows/mistake-analyzer';

function HataRaporuContent() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [examResults, setExamResults] = useState<ExamResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const fetchResults = async () => {
            try {
                const q = query(
                    collection(db, "examResults"),
                    where("userId", "==", user.uid),
                    orderBy("analyzedAt", "desc")
                );
                const querySnapshot = await getDocs(q);
                const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
                setExamResults(results);
                if (results.length > 0) {
                    handleResultSelect(results[0]);
                }
            } catch (error) {
                console.error("Error fetching exam results: ", error);
                toast({ title: "Hata", description: "Geçmiş deneme sonuçları alınamadı.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [user, toast]);

    const chartData = useMemo(() => {
        if (!selectedResult || !selectedResult.errorAnalysis) return [];
        const totalMistakes = Object.values(selectedResult.errorAnalysis).reduce((sum, count) => sum + count, 0);
        if (totalMistakes === 0) return [];
        return Object.entries(selectedResult.errorAnalysis).map(([key, value]) => ({
            name: ERROR_CATEGORIES[key as ErrorCategory],
            value: value,
        }));
    }, [selectedResult]);

    const handleResultSelect = async (result: ExamResult) => {
        setSelectedResult(result);
        setAiFeedback(null);
        if (!result.errorAnalysis || Object.keys(result.errorAnalysis).length === 0) return;
        
        setLoadingFeedback(true);
        try {
            const feedbackResult = await analyzeMistakes({
                studentName: user?.displayName || 'Öğrenci',
                errorAnalysis: result.errorAnalysis,
            });
            setAiFeedback(feedbackResult.feedback);
        } catch (error) {
            console.error("AI mistake analysis error:", error);
            toast({ title: "Hata", description: "Yapay zeka yorumu alınamadı.", variant: "destructive" });
        } finally {
            setLoadingFeedback(false);
        }
    };
    
    if (loading || authLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96 mt-2" />
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <Skeleton className="md:col-span-1 h-96" />
                    <Skeleton className="md:col-span-2 h-96" />
                </div>
            </div>
        )
    }

    if (examResults.length === 0) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center">
                 <div className="py-16">
                     <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Henüz Rapor Oluşturulmamış</h2>
                    <p className="mt-2 text-muted-foreground">
                        Hata analizi raporlarınızı görmek için lütfen önce "Deneme Analizi" sayfasından bir analiz yapın.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Hata Raporu</h1>
                <p className="text-muted-foreground">Deneme sınavlarındaki hatalarının kök nedenlerini anla ve gelişimini izle.</p>
            </div>
            <Separator />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ListChecks /> Geçmiş Denemeler</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                           {examResults.map(result => (
                               <button
                                   key={result.id}
                                   onClick={() => handleResultSelect(result)}
                                   className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedResult?.id === result.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50'}`}
                               >
                                   <p className="font-semibold">{result.examName}</p>
                                   <p className="text-sm opacity-80">{result.subjectName} - {result.gradeLevel}. Sınıf</p>
                                   <p className="text-xs opacity-60 mt-1">{format(result.analyzedAt.toDate(), 'd MMMM yyyy', { locale: tr })}</p>
                               </button>
                           ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-3">
                    {selectedResult ? (
                         <Card>
                            <CardHeader>
                                <CardTitle>{selectedResult.examName} - Analizi</CardTitle>
                                <CardDescription>{selectedResult.subjectName} dersi için detaylı hata analizi ve yapay zeka yorumu.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div>
                                        <h3 className="font-semibold mb-2 text-center text-lg">Hata Tiplerinin Dağılımı</h3>
                                        {chartData.length > 0 ? (
                                            <DonutChart
                                                className="h-64"
                                                data={chartData}
                                                category="value"
                                                index="name"
                                                valueFormatter={(number: number) => `${number} hata`}
                                                colors={['cyan', 'blue', 'indigo', 'violet', 'fuchsia']}
                                            />
                                        ) : <p className="text-center text-muted-foreground h-64 flex items-center justify-center">Hata kategorizasyonu yapılmamış veya hiç hata yok.</p>}
                                    </div>
                                    <div>
                                         <h3 className="font-semibold mb-2 text-lg">Yapay Zeka Koçu</h3>
                                         {loadingFeedback ? (
                                             <div className='space-y-2'>
                                                 <Skeleton className='h-4 w-full' />
                                                 <Skeleton className='h-4 w-full' />
                                                 <Skeleton className='h-4 w-5/6' />
                                             </div>
                                         ) : aiFeedback ? (
                                            <div className="p-4 bg-muted/50 border-l-4 border-accent rounded-r-md">
                                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{aiFeedback}</p>
                                            </div>
                                         ) : <p className="text-center text-muted-foreground">Yorum oluşturulması için hata verisi gerekli.</p>}
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div>
                                        <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="text-emerald-500" /> Güçlü Olduğun Konular</h3>
                                        <div className='mt-2 flex flex-wrap gap-2'>
                                            {selectedResult.strengths.length > 0 ? selectedResult.strengths.map(topic => (
                                                <Badge key={topic} variant="secondary" className='bg-emerald-100 text-emerald-800 hover:bg-emerald-200'>{topic}</Badge>
                                            )) : <p className='text-sm text-muted-foreground'>Belirgin bir güçlü konu bulunamadı.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingDown className="text-destructive" /> Odaklanman Gereken Konular</h3>
                                        <div className="mt-2 space-y-2">
                                            {selectedResult.weaknesses.map(weakness => (
                                                <div key={weakness.topic} className='p-2 border bg-background rounded-md'>
                                                    <p className="font-semibold text-sm">{weakness.topic}</p>
                                                    <p className="text-xs text-muted-foreground italic mt-1">{weakness.suggestion}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                         </Card>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center h-full min-h-[50vh] text-muted-foreground">
                            <HelpCircle className="w-16 h-16 mb-4" />
                            <p>Detaylarını görmek için soldaki listeden bir deneme seçin.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


export default function HataRaporuPage() {
    return (
        <AppLayout>
            <HataRaporuContent />
        </AppLayout>
    )
}
