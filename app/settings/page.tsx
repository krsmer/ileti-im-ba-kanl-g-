'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  getCurrentUser, 
  getUserProfile,
  updateUserProfile,
  updatePassword,
} from '@/lib/appwrite';
import type { UserProfile } from '@/lib/appwrite';
import { toast } from 'sonner';
import { User, Lock, Mail, Shield } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Profil form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Şifre form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userResult = await getCurrentUser();
        if (!userResult.success || !userResult.data) {
          router.push('/login');
          return;
        }

        const profile = await getUserProfile(userResult.data.$id);
        setUserProfile(profile);
        setName(profile.name);
        setEmail(profile.email);
      } catch (error) {
        console.error('Profil yükleme hatası:', error);
        toast.error('Profil bilgileri yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) return;

    if (!name || name.length < 2) {
      toast.error('İsim en az 2 karakter olmalıdır');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const result = await updateUserProfile(userProfile.$id!, { name });
      
      if (result.success) {
        toast.success('Profil güncellendi');
        setUserProfile({ ...userProfile, name });
      } else {
        toast.error(result.error || 'Profil güncellenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Tüm alanları doldurunuz');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const result = await updatePassword(oldPassword, newPassword);
      
      if (result.success) {
        toast.success('Şifre güncellendi');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error || 'Şifre güncellenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-8 w-8 border-4 border-[#161F9C] border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userProfile) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-500">Profil yüklenemedi</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">
            Ayarlar
          </h1>
          <p className="text-gray-600 mt-1">
            Profil bilgilerinizi ve şifrenizi yönetin
          </p>
        </div>

        {/* Profil Kartı */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-[#161F9C] text-white text-xl">
                  {getInitials(userProfile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{userProfile.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Shield className="h-4 w-4" />
                  {userProfile.role === 'yonetici' ? 'Yönetici' : 'Stajyer'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profil Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil Bilgileri
              </CardTitle>
              <CardDescription>
                İsim bilgilerinizi güncelleyebilirsiniz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">İsim</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isUpdatingProfile}
                    placeholder="İsminiz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    E-posta adresi değiştirilemez
                  </p>
                </div>
                <Separator />
                <Button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full bg-[#161F9C] hover:bg-[#1a23b0]"
                >
                  {isUpdatingProfile ? 'Güncelleniyor...' : 'Profili Güncelle'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Şifre Değiştir */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Şifre Değiştir
              </CardTitle>
              <CardDescription>
                Hesap güvenliğiniz için şifrenizi güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Mevcut Şifre</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    placeholder="Mevcut şifreniz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yeni Şifre</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    placeholder="En az 8 karakter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isUpdatingPassword}
                    placeholder="Yeni şifrenizi tekrar girin"
                  />
                </div>
                <Separator />
                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full bg-[#161F9C] hover:bg-[#1a23b0]"
                >
                  {isUpdatingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
