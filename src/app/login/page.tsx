'use client';

import { useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: { email: '', password: '' },
    });

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      toast({
        title: 'Başarılı!',
        description: 'Başarıyla giriş yaptınız.',
      });
      router.push('/');
    } catch (error: any) {
      console.error(`Giriş hatası:`, error);
      
      let errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
       if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'E-posta veya şifre hatalı.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className='absolute top-8 left-8 flex items-center gap-2'>
             <Target className="w-8 h-8 text-primary" />
             <h1 className='text-2xl font-bold font-headline'>Matematikçi AI</h1>
        </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Giriş Yap</CardTitle>
          <CardDescription>
            Devam etmek için hesabınıza giriş yapın.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(handleLogin)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" placeholder="ornek@eposta.com" {...form.register('email')} />
              {form.formState.errors.email && <p className='text-xs text-destructive'>{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password && <p className='text-xs text-destructive'>{form.formState.errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={loading}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
