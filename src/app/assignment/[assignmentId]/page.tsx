
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, Assignment } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// A simple markdown renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
    // This is a very basic renderer, can be replaced with a more robust library like 'react-markdown' if needed.
    const htmlContent = content
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold my-4">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold my-5">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold my-6">$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/---/gim, '<hr class="my-6 border-border" />')
        .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};


export default function AssignmentViewPage() {
    const params = useParams();
    const router = useRouter();
    const { user, studentData, loading: authLoading } = useAuth();
    const assignmentId = params.assignmentId as string;

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!studentData) {
            // Redirect if not the correct student or not logged in
            setError("Bu ödeve erişim yetkiniz yok veya öğrenci verisi bulunamadı.");
            setLoading(false);
            return;
        }

        const foundAssignment = studentData.assignments?.find(a => a.id === assignmentId);

        if (foundAssignment) {
            if (foundAssignment.content) {
                setAssignment(foundAssignment);
            } else {
                 setError("Bu ödevin görüntülenecek bir içeriği yok. Muhtemelen bir link ödevi.");
            }
        } else {
            setError("Ödev bulunamadı.");
        }
        setLoading(false);

    }, [assignmentId, studentData, authLoading, router]);

    if (loading || authLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-8 w-64" />
                <Separator />
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                 <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Anasayfaya Dön
                    </Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Hata</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!assignment) {
         return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <p>Ödev yüklenemedi.</p>
            </div>
         )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anasayfaya Dön
                </Link>
            </Button>
             <Card>
                <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                   {assignment.content && <MarkdownRenderer content={assignment.content} />}
                </CardContent>
            </Card>
        </div>
    );
}
