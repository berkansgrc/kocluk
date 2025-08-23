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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Lütfen geçerli bir e-posta adresi girin.' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleAuthAction = async (
    action: 'login' | 'signup',
    values: z.infer<typeof formSchema>
  ) => {
    setLoading(true);
    try {
      if (action === 'login') {
        await login(values.email, values.password);
      } else {
        await signup(values.email, values.password);
      }
      toast({
        title: 'Başarılı!',
        description:
          action === 'login'
            ? 'Başarıyla giriş yaptınız.'
            : 'Hesabınız başarıyla oluşturuldu.',
      });
      router.push('/');
    } catch (error: any) {
      console.error(`${action} hatası:`, error);
      
      let errorMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      if(error.message.includes('auth/invalid-credential')) {
        errorMessage = 'E-posta veya şifre hatalı.';
      } else if (error.message.includes('auth/email-already-in-use')) {
        errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
      } else if (error.message.includes('izniniz yok')) {
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

  const LoginForm = () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: { email: '', password: '' },
    });
    return (
      <form onSubmit={form.handleSubmit((values) => handleAuthAction('login', values))}>
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
    );
  };

  const SignupForm = () => {
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: { email: '', password: '' },
    });
    return (
      <form onSubmit={form.handleSubmit((values) => handleAuthAction('signup', values))}>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="email-signup">E-posta</Label>
            <Input id="email-signup" type="email" placeholder="ornek@eposta.com" {...form.register('email')} />
             {form.formState.errors.email && <p className='text-xs text-destructive'>{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-signup">Şifre</Label>
            <Input id="password-signup" type="password" {...form.register('password')} />
             {form.formState.errors.password && <p className='text-xs text-destructive'>{form.formState.errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={loading}>
            {loading ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
          </Button>
        </CardFooter>
      </form>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className='absolute top-8 left-8 flex items-center gap-2'>
             <Target className="w-8 h-8 text-primary" />
             <h1 className='text-2xl font-bold font-headline'>Matematikçi AI</h1>
        </div>
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Giriş Yap</TabsTrigger>
          <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Giriş Yap</CardTitle>
              <CardDescription>
                Devam etmek için hesabınıza giriş yapın.
              </CardDescription>
            </CardHeader>
            <LoginForm />
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Hesap Oluştur</CardTitle>
              <CardDescription>
                Başlamak için yeni bir hesap oluşturun. Yalnızca admin tarafından eklenen öğrenciler kayıt olabilir.
              </CardDescription>
            </CardHeader>
            <SignupForm />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
