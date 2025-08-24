
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FeedbackNote } from '@/lib/types';
import { MessageSquareQuote } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FeedbackListProps {
  feedbackNotes: FeedbackNote[];
}

export default function FeedbackList({ feedbackNotes }: FeedbackListProps) {
  
  const sortedNotes = [...feedbackNotes].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <MessageSquareQuote className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <CardTitle>Koçundan Notlar</CardTitle>
          <CardDescription>
            Öğretmeninin senin için bıraktığı en son notlar.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {sortedNotes.length > 0 ? (
          <ScrollArea className="h-48 pr-4">
            <ul className="space-y-4">
              {sortedNotes.map(note => (
                <li key={note.id} className="text-sm border-l-4 border-amber-400 pl-4 py-2">
                  <p className="font-medium text-foreground/90">{note.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(note.createdAt.toDate(), "d MMMM yyyy", { locale: tr })}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Henüz koçundan bir not bulunmuyor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
