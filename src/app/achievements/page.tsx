
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { allAchievements } from '@/lib/achievements';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const studentDocRef = doc(db, 'students', user.uid);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        setStudentData(studentDocSnap.data() as Student);
      } else {
        setStudentData(null);
      }
    } catch (error) {
      console.error("Error fetching student data for achievements:", error);
      toast({
        title: 'Veri Hatası',
        description: 'Başarım verileri alınamadı.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchStudentData();
    }
  }, [authLoading, fetchStudentData]);

  const unlockedAchievementIds = new Set(studentData?.unlockedAchievements || []);

  if (loading || authLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="items-center text-center">
                <Skeleton className="w-16 h-16 rounded-full" />
              </CardHeader>
              <CardContent className="text-center">
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-full mx-auto mt-2" />
                 <Skeleton className="h-4 w-1/2 mx-auto mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Başarımlarım
          </h1>
          <p className="text-muted-foreground">
            Kazandığın rozetler ve ulaşabileceğin yeni hedefler.
          </p>
        </div>
      </div>
      <Separator />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allAchievements.map((achievement) => {
          const isUnlocked = unlockedAchievementIds.has(achievement.id);
          const Icon = achievement.icon;
          return (
            <Card
              key={achievement.id}
              className={cn(
                "transition-all",
                isUnlocked ? 'border-accent shadow-accent/20 shadow-lg' : 'bg-muted/40'
              )}
            >
              <CardHeader className="items-center text-center">
                <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center bg-background border-4",
                     isUnlocked ? 'border-accent text-accent' : 'border-muted-foreground/20 text-muted-foreground/60'
                    )}>
                   <Icon className="w-8 h-8" />
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <CardTitle className={cn("text-lg", !isUnlocked && "text-muted-foreground")}>
                    {achievement.name}
                </CardTitle>
                <CardDescription className={cn(!isUnlocked && "text-muted-foreground/80")}>
                    {achievement.description}
                </CardDescription>
                {isUnlocked && (
                    <div className="mt-4 flex items-center justify-center text-emerald-500">
                        <CheckCircle className="w-4 h-4 mr-1"/>
                        <p className='text-sm font-medium'>Kazanıldı</p>
                    </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
