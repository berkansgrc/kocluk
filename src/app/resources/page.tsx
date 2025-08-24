
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Resource } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookCopy, FileVideo, PencilRuler, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/app-layout';

const iconMap = {
  note: BookCopy,
  exercise: PencilRuler,
  video: FileVideo,
};

function ResourcesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        const data = studentDocSnap.data();
        setResources(data.resources || []);
      } else {
        console.warn("No student data found for this user in Firestore.");
        setResources([]);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Kaynaklar alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchResources();
    }
  }, [authLoading, fetchResources]);


  if (loading || authLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent className='space-y-2 mt-2'>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-24 mt-4" />
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent className='space-y-2 mt-2'>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-24 mt-4" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent className='space-y-2 mt-2'>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-24 mt-4" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Kaynaklar
          </h1>
          <p className="text-muted-foreground">
            Öğrenme yolculuğunuzu desteklemek için size özel olarak atanmış materyaller.
          </p>
        </div>
      </div>
      <Separator />
      {resources.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const Icon = iconMap[resource.type] || BookCopy;
            return (
              <Card key={resource.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    {resource.title}
                  </CardTitle>
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {resource.description}
                  </p>
                  <a
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline mt-4"
                  >
                    Kaynağı Aç <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
         <div className="text-center py-16">
            <h2 className="text-xl font-semibold">Henüz Kaynak Atanmamış</h2>
            <p className="text-muted-foreground mt-2">
              Size özel kaynaklar atandığında burada görünecektir.
            </p>
          </div>
      )}
    </div>
  );
}

export default function ResourcesPage() {
    return (
        <AppLayout>
            <ResourcesPageContent />
        </AppLayout>
    )
}
