
'use client';

import { useState, useEffect, useRef } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


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
import { Target, ArrowRight, NotebookPen, BrainCircuit, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


const formSchema = z.object({
  email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

// A separate component for the Lottie animation to avoid hydration errors with the library.
const DotLottieComponent = ({className}: {className?: string}) => {
    return (
        <DotLottieReact
            src="https://lottie.host/34caaa3d-834d-4b9f-9d6d-0d4ea8ba269f/xF1VSbNLcn.lottie"
            loop
            autoplay
            className={className}
        />
    )
}

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
       <section className="relative w-full overflow-hidden bg-background">
        <div className="container mx-auto grid min-h-screen grid-cols-1 items-center gap-12 px-4 md:grid-cols-2 lg:gap-20">
          <div className="relative z-10 flex flex-col items-start text-left">
             <div className="mb-4 flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold font-heading">Berkan Hoca</h1>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl font-heading">
              Yapay Zeka ile <span className="text-primary">Matematik</span> Başarını Garantile
            </h2>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Kişiselleştirilmiş çalışma planları, detaylı analizler ve yapay zeka destekli geri bildirimlerle potansiyelini en üst seviyeye çıkar.
            </p>
            <Button size="lg" className="mt-8 group" onClick={scrollToLogin}>
              Hemen Başla
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
           <div className="relative hidden h-full w-full items-center justify-center md:flex">
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute right-0 top-1/2 h-full w-full max-w-2xl -translate-y-1/2">
                <div className="absolute inset-y-0 right-0 z-0 h-full w-full rounded-full bg-primary/5 blur-[80px]"></div>
            </div>
             <DotLottieComponent className="relative z-10 h-auto w-[200%] max-w-[200%] opacity-90" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-secondary/40 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading sm:text-4xl">Platformun Sundukları</h2>
            <p className="mt-2 text-lg text-muted-foreground">Sınavlara hazırlık sürecini senin için nasıl kolaylaştırıyoruz?</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <Card className="h-full">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-2">
                    <NotebookPen className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>Kişiye Özel Çalışma Planı</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription>Yapay zeka, performansını analiz eder ve sana özel haftalık çalışma programları oluşturur.</CardDescription>
                </CardContent>
              </Card>
            </div>
            {/* Feature 2 */}
            <div className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <Card className="h-full">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-2">
                    <BrainCircuit className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>7/24 Yapay Zeka Desteği</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription>Zayıf olduğun konuları tespit eder ve anında geri bildirimlerle sana yol gösterir.</CardDescription>
                </CardContent>
              </Card>
            </div>
            {/* Feature 3 */}
            <div className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <Card className="h-full">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-2">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>Detaylı İlerleme Takibi</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription>Grafikler ve raporlarla netlerini, çalışma süreni ve konu bazlı başarı durumunu izle.</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
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
