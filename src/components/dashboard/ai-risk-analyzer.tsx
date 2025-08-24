
'use client';

import { useEffect, useState } from 'react';
import { riskAnalyzer, type RiskAnalyzerInput, type RiskAnalyzerOutput } from '@/ai/flows/risk-analyzer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ShieldAlert, Zap } from 'lucide-react';
import type { StudySession } from '@/lib/types';
import { Alert, AlertDescription } from '../ui/alert';

interface AIRiskAnalyzerProps {
  studentName: string;
  studySessions: StudySession[];
  weeklyGoal: number;
}

const iconMap = {
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    critical: <ShieldAlert className="h-5 w-5 text-destructive" />,
};

const variantMap = {
    warning: 'default',
    critical: 'destructive',
} as const;

export default function AIRiskAnalyzer({ studentName, studySessions, weeklyGoal }: AIRiskAnalyzerProps) {
  const [analysis, setAnalysis] = useState<RiskAnalyzerOutput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getAnalysis() {
      if (studySessions.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const input: RiskAnalyzerInput = {
          studentName,
          studySessions,
          weeklyGoal,
        };
        const result = await riskAnalyzer(input);
        setAnalysis(result);
      } catch (error) {
        console.error('AI risk analysis error:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }
    getAnalysis();
  }, [studentName, studySessions, weeklyGoal]);

  const hasRisks = analysis && analysis.risks && analysis.risks.length > 0;

  if (loading) {
     return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Zap className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                    <CardTitle>Performans Radarı</CardTitle>
                    <CardDescription>
                        AI, gelişimini etkileyebilecek noktaları analiz ediyor.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>
     )
  }
  
  if (!hasRisks) {
    return null; // Don't show the card if there are no risks to report
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
         <div className="p-2 bg-amber-500/10 rounded-lg">
            <Zap className="w-6 h-6 text-amber-500" />
        </div>
        <div>
            <CardTitle>Performans Radarı</CardTitle>
            <CardDescription>
            AI tarafından tespit edilen ve dikkat etmen gereken noktalar.
            </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        {analysis?.risks.map(risk => (
            <Alert key={risk.id} variant={variantMap[risk.severity]}>
                {iconMap[risk.severity]}
                <AlertDescription className="pl-2">
                 {risk.description}
                </AlertDescription>
            </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
