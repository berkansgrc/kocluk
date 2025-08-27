
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Target, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const loginCardRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: { email: '', password: '' },
    });
  
  useEffect(() => {
    if (loading) return;
    if (user) {
        if (isAdmin) {
            router.push('/admin');
        } else {
            router.push('/');
        }
    }
  }, [user, loading, router, isAdmin]);


  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      toast({
        title: 'Başarılı!',
        description: 'Başarıyla giriş yaptınız. Yönlendiriliyorsunuz...',
      });
    } catch (error: any) {
      console.error(`Giriş hatası:`, error);
      
      let errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
       if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'E-posta veya şifre hatalı.';
      }

      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToLogin = () => {
    loginCardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  if (loading || user) {
     return (
       <div className="flex h-screen w-screen items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
         </div>
       </div>
     )
  }

  return (
    <div className="w-full bg-background">
      {/* Hero Section */}
      <section className="relative flex h-screen min-h-[600px] w-full flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/50 to-background">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
         <div className="container relative z-10 mx-auto flex flex-col items-center justify-center px-4 text-center">
             <div className="flex items-center gap-2 mb-4">
                <Target className="w-10 h-10 text-primary" />
                <h1 className='text-3xl font-bold font-heading'>Berkan Hoca</h1>
             </div>
             <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-heading">
                Yapay Zeka ile Matematik Başarını Garantile
             </h2>
             <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-xl">
               Kişiselleştirilmiş çalışma planları, detaylı analizler ve yapay zeka destekli geri bildirimlerle potansiyelini en üst seviyeye çıkar.
             </p>
             <Button size="lg" className="mt-8" onClick={scrollToLogin}>
                Hemen Başla <ArrowDown className="ml-2 h-5 w-5 animate-bounce" />
             </Button>
         </div>
      </section>

      {/* Login Section */}
      <section ref={loginCardRef} id="login" className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md mx-auto transition-all shadow-lg hover:shadow-xl">
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
              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>
    </div>
  );
}
