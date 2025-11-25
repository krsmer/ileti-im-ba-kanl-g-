'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Activity,
  Plus,
  Users,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { logout, getCurrentUser, getUserProfile } from '@/lib/appwrite';
import type { UserProfile } from '@/lib/appwrite';
import { toast } from 'sonner';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userProfile?: UserProfile;
}

// Menü öğelerini component dışına taşıyoruz - her render'da yeniden oluşturulmasını önler
const STAJYER_MENU_ITEMS = [
  {
    title: 'Aktivitelerim',
    icon: Activity,
    url: '/activities',
  },
  {
    title: 'Ayarlar',
    icon: Settings,
    url: '/settings',
  },
] as const;

const YONETICI_MENU_ITEMS = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    url: '/dashboard',
  },
  {
    title: 'Tüm Stajyerler',
    icon: Users,
    url: '/students',
  },
  {
    title: 'Ayarlar',
    icon: Settings,
    url: '/settings',
  },
] as const;

// getInitials fonksiyonunu component dışına taşıyoruz - pure function olarak
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function AppSidebar({ userProfile, ...props }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // useMemo ile optimize - sadece role değiştiğinde yeniden hesaplanır
  const isYonetici = React.useMemo(
    () => userProfile?.role === 'yonetici',
    [userProfile?.role]
  );

  // Menü öğelerini memoize ediyoruz
  const menuItems = React.useMemo(
    () => (isYonetici ? YONETICI_MENU_ITEMS : STAJYER_MENU_ITEMS),
    [isYonetici]
  );

  // User initials'ı memoize ediyoruz - sadece isim değiştiğinde hesaplanır
  const userInitials = React.useMemo(
    () => (userProfile?.name ? getInitials(userProfile.name) : ''),
    [userProfile?.name]
  );

  // useCallback ile handleLogout'u optimize ediyoruz - fonksiyon referansı stabil kalır
  const handleLogout = React.useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (result.success) {
        toast.success('Çıkış yapıldı');
        router.push('/login');
      } else {
        toast.error('Çıkış yapılamadı');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return (
    <Sidebar {...props} className="backdrop-blur-md lg:bg-sidebar/60 bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-white">
            <Image 
              src="/logo_iletisim.png" 
              alt="İletişim Başkanlığı Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-sm">
              Performans Takip
            </span>
            <span className="text-xs text-muted-foreground">
              İletişim Başkanlığı
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isYonetici ? 'Yönetici Paneli' : 'Stajyer Paneli'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url} prefetch={true}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {userProfile && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{userProfile.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userProfile.email}
                </p>
              </div>
            </div>
            <Separator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
