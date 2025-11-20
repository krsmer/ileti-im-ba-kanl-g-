'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  getCurrentUser,
  getUserProfile,
  getActivityByUser,
  updateActivity,
} from '@/lib/appwrite';
import type { Activity } from '@/lib/appwrite';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  'Yazılım',
  'Tasarım',
  'İçerik Üretimi',
  'Sosyal Medya',
  'Video Prodüksiyon',
  'Grafik Tasarım',
  'Web Tasarım',
  'Metin Yazarlığı',
  'Araştırma',
  'Diğer'
];

export default function EditActivityPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const userResult = await getCurrentUser();
        if (!userResult.success || !userResult.data) {
          router.push('/login');
          return;
        }

        // Kullanıcının aktivitelerini al
        const activitiesResult = await getActivityByUser(userResult.data.$id);
        if (activitiesResult.success && activitiesResult.data) {
          const foundActivity = activitiesResult.data.documents.find(
            (doc: any) => doc.$id === activityId
          );

          if (foundActivity) {
            const activityData: Activity = {
              $id: foundActivity.$id,
              userId: foundActivity.userId,
              userName: foundActivity.userName,
              category: foundActivity.category,
              description: foundActivity.description,
              date: foundActivity.date,
              $createdAt: foundActivity.$createdAt,
              $updatedAt: foundActivity.$updatedAt,
            };

            setActivity(activityData);
            setCategory(activityData.category);
            setDescription(activityData.description);
            setDate(activityData.date.split('T')[0]);
          } else {
            toast.error('Aktivite bulunamadı');
            router.push('/activities');
          }
        }
      } catch (error) {
        console.error('Aktivite yükleme hatası:', error);
        toast.error('Aktivite yüklenemedi');
        router.push('/activities');
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [router, activityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activity) return;

    if (!category || !description || !date) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateActivity(activity.$id!, {
        category,
        description,
        date: new Date(date).toISOString(),
      });

      if (result.success) {
        toast.success('Aktivite güncellendi');
        router.push('/activities');
      } else {
        toast.error(result.error || 'Aktivite güncellenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
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

  if (!activity) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-500">Aktivite bulunamadı</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/activities">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold">Aktiviteyi Düzenle</h1>
            <p className="text-muted-foreground">
              Aktivite bilgilerinizi güncelleyin
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aktivite Bilgileri</CardTitle>
            <CardDescription>
              Değiştirmek istediğiniz alanları güncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Tarih</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  placeholder="Yaptığınız çalışmayı detaylı bir şekilde açıklayın..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  {description.length} / 2000 karakter
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#161F9C] hover:bg-[#1a23b0] gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                </Button>
                <Link href="/activities" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    İptal
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
