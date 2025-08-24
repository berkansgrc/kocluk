'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCheck } from 'lucide-react';
import type { Assignment } from '@/lib/types';
import Link from 'next/link';

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
            {assignments.map(ass => (
              <li key={ass.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                <span>{ass.title}</span>
                <Button variant="outline" size="sm" asChild>
                   <a href={ass.driveLink} target="_blank" rel="noopener noreferrer">
                      Görüntüle
                   </a>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Henüz atanmış bir ödevin bulunmuyor.</p>
        )}
      </CardContent>
    </Card>
  );
}
