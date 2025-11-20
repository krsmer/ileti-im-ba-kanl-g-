'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login, getCurrentUser, getUserProfile } from '@/lib/appwrite';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validation
    if (!email || !email.includes('@')) {
      toast.error('Geçerli bir e-posta adresi giriniz');
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success('Giriş başarılı!');
        
        // Kullanıcı rolüne göre yönlendir
        const userResult = await getCurrentUser();
        if (userResult.success && userResult.data) {
          const profile = await getUserProfile(userResult.data.$id);
          
          if (profile.role === 'yonetici') {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/activities';
          }
        } else {
          window.location.href = '/activities';
        }
      } else {
        toast.error(result.error || 'Giriş başarısız');
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#161F9C] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Diagonal Lines */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diagonal" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="80" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diagonal)" />
          </svg>
        </div>

        {/* Content - positioned above patterns */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center">
            <Image
              src="/logo_iletisim.png"
              alt="İletişim Başkanlığı Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white">İletişim Başkanlığı</h2>
            <p className="text-white/80 text-sm">Performans Takip Sistemi</p>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center">
          <Image
            src="/landing-photo.png"
            alt="Performans Takip"
            width={600}
            height={400}
            className="object-contain"
          />
        </div>

        <div className="relative z-10 text-white space-y-4">
          <h2 className="text-4xl font-heading font-bold leading-tight">
            Stajyer Performans<br />Takip Sistemi
          </h2>
          <p className="text-gray-300 text-lg">
            Aktivitelerinizi takip edin, performansınızı analiz edin ve gelişiminizi görün.
          </p>
        </div>

        <div className="relative z-10 text-gray-400 text-sm">
          © 2025 İletişim Başkanlığı. Tüm hakları saklıdır.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold mb-2">Hesabınıza Giriş Yapın</h1>
            <p className="text-muted-foreground">E-posta ve şifrenizi girerek giriş yapın</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">E-posta</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ornek@example.com"
                  disabled={isLoading}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Şifre</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  disabled={isLoading}
                  required
                />
                <FieldDescription>
                  En az 8 karakter uzunluğunda olmalıdır
                </FieldDescription>
              </Field>
              <Field>
                <Button
                  type="submit"
                  className="w-full bg-[#161F9C] hover:bg-[#1a23b0] cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{' '}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
