'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PieChart } from '@/components/charts/pie-chart';
import { LineChart } from '@/components/charts/line-chart';
import { 
  getCurrentUser, 
  getUserProfile,
  getActivityByUser,
  updateActivity,
} from '@/lib/appwrite';
import type { Activity, UserProfile } from '@/lib/appwrite';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Calendar, Activity as ActivityIcon, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineDays, setTimelineDays] = useState(7);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  const getDateKey = (value: string | Date) => {
    const date = typeof value === 'string' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return format(date, 'yyyy-MM-dd');
  };

  const buildTimelineKeys = (length: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const keys: string[] = [];

    for (let i = length - 1; i >= 0; i--) {
      const cursor = new Date(today);
      cursor.setDate(cursor.getDate() - i);
      keys.push(getDateKey(cursor));
    }

    return keys;
  };

  const handleOpenComment = (activity: Activity) => {
    setSelectedActivity(activity);
    setCommentText(activity.managerComment || '');
    setCommentDialogOpen(true);
  };

  const handleCloseComment = () => {
    setCommentDialogOpen(false);
    setSelectedActivity(null);
    setCommentText('');
  };

  const handleSaveComment = async () => {
    if (!selectedActivity?.$id) return;

    setIsSavingComment(true);
    try {
      const result = await updateActivity(selectedActivity.$id, {
        managerComment: commentText.trim(),
      });

      if (result.success) {
        setActivities((prev) =>
          prev.map((activity) =>
            activity.$id === selectedActivity.$id
              ? { ...activity, managerComment: commentText.trim() }
              : activity
          )
        );
        toast.success('Yorum kaydedildi');
        handleCloseComment();
      } else {
        toast.error(result.error || 'Yorum kaydedilemedi');
      }
    } catch (error) {
      console.error('Yorum kaydetme hatası:', error);
      toast.error('Yorum kaydedilemedi');
    } finally {
      setIsSavingComment(false);
    }
  };

  useEffect(() => {
    const loadStudentDetail = async () => {
      try {
        // Yetki kontrolü
        const userResult = await getCurrentUser();
        if (!userResult.success || !userResult.data) {
          router.push('/login');
          return;
        }

        const profile = await getUserProfile(userResult.data.$id);
        if (profile.role !== 'yonetici') {
          toast.error('Bu sayfaya erişim yetkiniz yok');
          router.push('/activities');
          return;
        }

        // Stajyer bilgilerini al
        const studentProfile = await getUserProfile(studentId);
        setStudent(studentProfile);

        // Stajyerin aktivitelerini al
        const activitiesResult = await getActivityByUser(studentId);
        if (activitiesResult.success && activitiesResult.data) {
          const activitiesData = activitiesResult.data.documents.map((doc: any) => ({
            $id: doc.$id,
            userId: doc.userId,
            userName: doc.userName,
            category: doc.category,
            description: doc.description,
            date: doc.date,
            $createdAt: doc.$createdAt,
            managerComment: doc.managerComment,
          }));
          setActivities(activitiesData);

          // Kategori dağılımı hesapla
          const categoryCount: { [key: string]: number } = {};
          activitiesData.forEach((activity: Activity) => {
            categoryCount[activity.category] = (categoryCount[activity.category] || 0) + 1;
          });

          const pieData = {
            labels: Object.keys(categoryCount),
            datasets: [
              {
                label: 'Aktivite Sayısı',
                data: Object.values(categoryCount),
                backgroundColor: [
                  'rgba(22, 31, 156, 0.8)',
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(168, 85, 247, 0.8)',
                  'rgba(0, 217, 255, 0.8)',
                ],
                borderColor: [
                  'rgba(22, 31, 156, 1)',
                  'rgba(34, 197, 94, 1)',
                  'rgba(245, 158, 11, 1)',
                  'rgba(239, 68, 68, 1)',
                  'rgba(168, 85, 247, 1)',
                  'rgba(0, 217, 255, 1)',
                ],
                borderWidth: 2,
              },
            ],
          };
          setCategoryData(pieData);

          // Zaman çizelgesi oluştur (son 7 gün)
          const timelineKeys = buildTimelineKeys(7);

          const timeline: { [key: string]: number } = {};
          timelineKeys.forEach((key) => {
            timeline[key] = 0;
          });

          activitiesData.forEach((activity: Activity) => {
            const key = getDateKey(activity.date);
            if (key && timeline.hasOwnProperty(key)) {
              timeline[key]++;
            }
          });

          const chartLabels = timelineKeys.map((dateKey) => {
            const [year, month, day] = dateKey.split('-').map(Number);
            const labelDate = new Date(year, (month || 1) - 1, day || 1);
            return format(labelDate, 'd MMM', { locale: tr });
          });

          const datasetValues = timelineKeys.map((key) => timeline[key]);

          const lineData = {
            labels: chartLabels,
            datasets: [
              {
                label: 'Aktivite Sayısı',
                data: datasetValues,
                borderColor: 'rgba(22, 31, 156, 1)',
                backgroundColor: 'rgba(22, 31, 156, 0.1)',
                tension: 0.4,
                fill: true,
              },
            ],
          };

          setTimelineDays(timelineKeys.length || 7);
          setTimelineData(lineData);
        }
      } catch (error) {
        console.error('Stajyer detay yükleme hatası:', error);
        toast.error('Stajyer bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadStudentDetail();
  }, [router, studentId]);

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

  if (!student) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-500">Stajyer bulunamadı</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-gray-900">
              Stajyer Detayı
            </h1>
          </div>
        </div>

        {/* Stajyer Bilgileri */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-[#161F9C] text-white text-2xl">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-gray-900">
                    {student.name}
                  </h2>
                  <Badge variant="secondary" className="mt-2">Stajyer</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Kayıt: {format(new Date(student.$createdAt || ''), 'd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4" />
                    <span>{activities.length} aktivite</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* İstatistikler */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam Aktivite
              </CardTitle>
              <ActivityIcon className="h-4 w-4 text-[#161F9C]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {activities.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Kategori Sayısı
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#161F9C]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {categoryData ? categoryData.labels.length : 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Son {timelineDays} Gün
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {timelineData ? timelineData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grafikler */}
        {activities.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kategori Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData ? (
                  <PieChart data={categoryData} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-gray-500">Veri yok</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Aktivite Trendi (Son {timelineDays} Gün)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineData ? (
                  <LineChart data={timelineData} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-gray-500">Veri yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aktiviteler Tablosu */}
        <Card>
          <CardHeader>
            <CardTitle>Tüm Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Yönetici Yorumu</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      Henüz aktivite bulunmuyor
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => (
                    <TableRow key={activity.$id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(activity.date), 'd MMMM yyyy', { locale: tr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{activity.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        {activity.description}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-gray-600">
                        {activity.managerComment ? (
                          <span>{activity.managerComment}</span>
                        ) : (
                          <span className="text-gray-400">Henüz yorum yok</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleOpenComment(activity)}
                        >
                          {activity.managerComment ? 'Yorumu Düzenle' : 'Yorum Ekle'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={commentDialogOpen} onOpenChange={(open) => (!open ? handleCloseComment() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yönetici Yorumu</DialogTitle>
            <DialogDescription>
              Bu aktivite için stajyere geri bildirim bırakabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Yorumunuzu yazın"
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseComment} disabled={isSavingComment}>
              İptal
            </Button>
            <Button onClick={handleSaveComment} disabled={isSavingComment} className="bg-[#161F9C] hover:bg-[#1a23b0]">
              {isSavingComment ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
