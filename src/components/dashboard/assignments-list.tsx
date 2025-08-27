
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCheck, FileText } from 'lucide-react';
import type { Assignment } from '@/lib/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface AssignmentsListProps {
  assignments: Assignment[];
}

export default function AssignmentsList({ assignments }: AssignmentsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookCheck /> Atanmış Ödevler
        </CardTitle>
        <CardDescription>
          Öğretmeninin sana atadığı ödevler burada listelenir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignments && assignments.length > 0 ? (
          <ul className="space-y-2">
            {assignments.sort((a,b) => b.assignedAt.toMillis() - a.assignedAt.toMillis()).map(ass => (
              <li key={ass.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                <span className='flex items-center gap-2'>
                  {ass.title}
                  {ass.isNew && <Badge variant="destructive">Yeni</Badge>}
                </span>
                <Button variant="outline" size="sm" asChild>
                   <a href={ass.driveLink} target="_blank" rel="noopener noreferrer">
                      Görüntüle
                   </a>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4" />
            <p className="font-medium">Henüz atanmış bir ödevin bulunmuyor.</p>
            <p className="text-sm">Ödevlerin burada listelenecek.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
