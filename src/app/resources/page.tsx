import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookCopy, FileVideo, PencilRuler, ExternalLink } from 'lucide-react';

const resources = [
  {
    title: 'Trigonometry Notes',
    description: 'Comprehensive notes covering all key concepts.',
    icon: BookCopy,
    dataAiHint: 'books library',
  },
  {
    title: 'Calculus Exercises',
    description: 'Practice problems to sharpen your skills.',
    icon: PencilRuler,
    dataAiHint: 'math notebook',
  },
  {
    title: 'Geometry Videos',
    description: 'Visual explanations of complex geometric theorems.',
    icon: FileVideo,
    dataAiHint: 'video lecture',
  },
];

export default function ResourcesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Resources
          </h1>
          <p className="text-muted-foreground">
            Curated materials to support your learning journey.
          </p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <Card key={resource.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                {resource.title}
              </CardTitle>
              <resource.icon className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {resource.description}
              </p>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center text-sm font-medium text-primary hover:underline mt-4"
              >
                Open Resource <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
