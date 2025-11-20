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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PieChart } from '@/components/charts/pie-chart';
import { LineChart } from '@/components/charts/line-chart';
import { 
  getCurrentUser, 
  getUserProfile,
  getActivityByUser,
  listAllInterns,
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
          const timeline: { [key: string]: number } = {};
          const today = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            timeline[dateKey] = 0;
          }

          activitiesData.forEach((activity: Activity) => {
            const activityDate = activity.date.split('T')[0];
            if (timeline.hasOwnProperty(activityDate)) {
              timeline[activityDate]++;
            }
          });

          const lineData = {
            labels: Object.keys(timeline).map(date => {
              const d = new Date(date);
              return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            }),
            datasets: [
              {
                label: 'Aktivite Sayısı',
                data: Object.values(timeline),
                borderColor: 'rgba(22, 31, 156, 1)',
                backgroundColor: 'rgba(22, 31, 156, 0.1)',
                tension: 0.4,
                fill: true,
              },
            ],
          };
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
                Son 7 Gün
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
                <CardTitle>Aktivite Trendi (Son 7 Gün)</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
