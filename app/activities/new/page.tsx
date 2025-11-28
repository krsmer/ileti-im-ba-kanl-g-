'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { UserProfile } from '@/lib/appwrite';
import { createActivity, getCurrentUser, getUserProfile, listAllInterns } from '@/lib/appwrite';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const activitySchema = z.object({
  category: z.string(),
  description: z.string(),
  date: z.date(),
  participants: z.array(z.string()).optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

const categories = [
  'Yazılım',
  'Tasarım',
  'Analiz',
  'Toplantı',
  'Eğitim',
  'Diğer',
];

export default function NewActivityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [userId, setUserId] = React.useState<string>('');
  const [userName, setUserName] = React.useState<string>('');
  const [interns, setInterns] = React.useState<UserProfile[]>([]);
  const [isLoadingInterns, setIsLoadingInterns] = React.useState(true);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      category: '',
      description: '',
      date: new Date(),
      participants: [],
    },
  });

  React.useEffect(() => {
    async function loadUser() {
      const userResult = await getCurrentUser();
      if (userResult.success && userResult.data) {
        setUserId(userResult.data.$id);
        try {
          const profile = await getUserProfile(userResult.data.$id);
          setUserName(profile.name);
        } catch (error) {
          console.error('Profile load error:', error);
        }

        try {
          const internsResult = await listAllInterns();
          if (internsResult.success && internsResult.data) {
            const internProfiles = internsResult.data.documents.map((doc: any) => ({
              $id: doc.$id,
              userId: doc.userId as string,
              name: doc.name as string,
              email: doc.email as string,
              role: doc.role as 'stajyer' | 'yonetici',
              $createdAt: doc.$createdAt,
              $updatedAt: doc.$updatedAt,
            }));
            setInterns(internProfiles);
          }
        } catch (error) {
          console.error('Intern list load error:', error);
        } finally {
          setIsLoadingInterns(false);
        }
      } else {
        setIsLoadingInterns(false);
      }
    }
    loadUser();
  }, []);

  async function onSubmit(data: ActivityFormValues) {
    setIsLoading(true);
    try {
      const participantIds = Array.from(new Set([userId, ...(data.participants || [])]));
      const participantNames = participantIds
        .map((id) => {
          if (id === userId) return userName;
          const intern = interns.find((i) => i.userId === id);
          return intern?.name;
        })
        .filter((name): name is string => Boolean(name));

      const result = await createActivity({
        userId,
        userName,
        category: data.category,
        description: data.description,
        date: data.date.toISOString(),
        participantIds,
        participantNames,
      });

      if (result.success) {
        toast.success('Aktivite başarıyla eklendi!');
        router.push('/activities');
      } else {
        toast.error(result.error || 'Aktivite eklenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-heading">Yeni Aktivite Ekle</CardTitle>
            <CardDescription>
              Günlük çalışmalarınızı ve yaptığınız aktiviteleri kaydedin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Kategori seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Aktivitenizin kategorisini seçin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Yaptığınız veya yapacağınız çalışmayı detaylı bir şekilde açıklayın..."
                          className="min-h-[120px]"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Yaptığınız işi detaylı bir şekilde açıklayın
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stajyerler</FormLabel>
                      <FormControl>
                        <div className="space-y-3 rounded-md border p-3">
                          {isLoadingInterns ? (
                            <p className="text-sm text-muted-foreground">Stajyerler yükleniyor...</p>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Seni otomatik olarak aktiviteye ekliyoruz. Birlikte çalışacağın stajyerleri seçebilirsin.
                              </p>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {interns
                                  .filter((intern) => intern.userId !== userId)
                                  .map((intern) => {
                                    const selected = field.value?.includes(intern.userId);
                                    return (
                                      <label
                                        key={intern.userId}
                                        className="flex items-center gap-3 text-sm"
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-4 w-4 rounded border-gray-300"
                                          checked={selected}
                                          onChange={() => {
                                            const currentValue = field.value || [];
                                            if (selected) {
                                              field.onChange(currentValue.filter((id) => id !== intern.userId));
                                            } else {
                                              field.onChange([...currentValue, intern.userId]);
                                            }
                                          }}
                                          disabled={isLoading}
                                        />
                                        <span>{intern.name}</span>
                                      </label>
                                    );
                                  })}
                              </div>
                              {field.value && field.value.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                  {field.value.map((id) => {
                                    const intern = interns.find((i) => i.userId === id);
                                    return (
                                      <span key={id} className="rounded-full bg-gray-100 px-3 py-1">
                                        {intern?.name || 'Bilinmeyen'}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Ortak faaliyetleri diğer stajyerlerle paylaşmak için seçim yapın
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tarih</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                              disabled={isLoading}
                            >
                              {field.value ? (
                                format(field.value, 'dd MMMM yyyy', { locale: tr })
                              ) : (
                                <span>Tarih seçiniz</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date('2024-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Aktivitenin yapıldığı tarihi seçin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-[#161F9C] hover:bg-[#1a23b0]"
                  >
                    {isLoading ? 'Kaydediliyor...' : 'Aktivite Ekle'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
