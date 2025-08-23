'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { student } from '@/lib/mock-data';
import { Send } from 'lucide-react';

const formSchema = z.object({
  studentName: z.string({ required_error: 'Lütfen bir öğrenci seçin.' }),
  documentUrl: z.string().url({ message: 'Lütfen geçerli bir URL girin.' }),
});

export default function AdminPage() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentUrl: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Döküman gönderildi:', values);
    toast({
      title: 'Döküman Gönderildi!',
      description: `${values.studentName} adlı öğrenciye döküman başarıyla gönderildi.`,
    });
    form.reset();
  }
  
  // In a real app, you would fetch a list of students
  const students = [student];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Admin Paneli
          </h1>
          <p className="text-muted-foreground">
            Uygulama verilerini ve ayarlarını yönetin.
          </p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoş Geldiniz</CardTitle>
            <CardDescription>
              Burası sizin admin paneliniz. Gelecekte buraya daha fazla özellik
              ekleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Yönetim görevlerinizi buradan gerçekleştirebilirsiniz.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Döküman Gönder</CardTitle>
            <CardDescription>
              Öğrencilere Google Drive döküman bağlantıları gönderin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="studentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Öğrenci</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Bir öğrenci seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.email} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Drive Linki</FormLabel>
                      <FormControl>
                        <Input placeholder="https://docs.google.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  <Send className="mr-2 h-4 w-4" /> Gönder
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
