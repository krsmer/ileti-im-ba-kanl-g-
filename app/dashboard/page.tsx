'use client';

import { LineChart } from '@/components/charts/line-chart';
import { PieChart } from '@/components/charts/pie-chart';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Activity } from '@/lib/appwrite';
import {
  getActivityTimeline,
  getCategoryDistribution,
  getCurrentUser,
  getMostActiveIntern,
  getTodayActiveInterns,
  getTotalActivities,
  getTotalInterns,
  getUserProfile,
  getUserProfilesByIds,
  listAllActivities,
} from '@/lib/appwrite';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity as ActivityIcon, Award, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInterns: 0,
    todayActive: 0,
    totalActivities: 0,
    mostActiveIntern: { name: '-', count: 0 },
  });
  const [categoryData, setCategoryData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineDays, setTimelineDays] = useState(7);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const loadStats = async () => {
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
        const [totalInterns, todayActive, totalActivities, mostActive, categoryDist, timeline, activities] =
          await Promise.all([
            getTotalInterns(),
            getTodayActiveInterns(),
            getTotalActivities(),
            getMostActiveIntern(),
            getCategoryDistribution(),
            getActivityTimeline(7),
            listAllActivities(10),
          ]);

        setStats({
          totalInterns,
          todayActive,
          totalActivities,
          mostActiveIntern: mostActive,
        });

        // Pie chart için veri hazırla
        const distribution = categoryDist.data || {};
        const pieData = {
          labels: Object.keys(distribution),
          datasets: [
            {
              label: 'Aktivite Sayısı',
              data: Object.values(distribution),
              backgroundColor: [
                'rgba(22, 31, 156, 0.8)',   // #161F9C - Mavi
                'rgba(34, 197, 94, 0.8)',    // Yeşil
                'rgba(245, 158, 11, 0.8)',   // Turuncu
                'rgba(239, 68, 68, 0.8)',    // Kırmızı
                'rgba(168, 85, 247, 0.8)',   // Mor
                'rgba(0, 217, 255, 0.8)',    // Açık Mavi
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

        // Line chart için veri hazırla
        const timelineObj = timeline.data || {};
        const orderedKeys = (timeline.labels && timeline.labels.length > 0)
          ? timeline.labels
          : Object.keys(timelineObj);

        const chartLabels = orderedKeys.map((dateKey) => {
          const [year, month, day] = dateKey.split('-').map(Number);
          const labelDate = new Date(year, (month || 1) - 1, day || 1);
          return labelDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        });

        const datasetValues = orderedKeys.map((key) => timelineObj[key] ?? 0);

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

        setTimelineDays(orderedKeys.length || 7);
        setTimelineData(lineData);

        // Son aktiviteleri ayarla
        if (activities.success && activities.data) {
          const activitiesData = activities.data.documents.map((doc: any) => ({
            $id: doc.$id,
            userId: doc.userId,
            userName: doc.userName,
            category: doc.category,
            description: doc.description,
            date: doc.date,
            $createdAt: doc.$createdAt,
            managerComment: doc.managerComment,
          }));

          const uniqueUserIds = Array.from(
            new Set(activitiesData.map((activity) => activity.userId).filter(Boolean))
          );
          const profilesMap = await getUserProfilesByIds(uniqueUserIds);

          const enhancedActivities = activitiesData.map((activity) => ({
            ...activity,
            userName: profilesMap[activity.userId]?.name || activity.userName,
          }));

          setRecentActivities(enhancedActivities);
        }
      } catch (error) {
        console.error('Dashboard yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-8 w-8 border-4 border-[#161F9C] border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Stajyer performans istatistiklerine genel bakış
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam Stajyer
              </CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalInterns}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bugün Aktif
              </CardTitle>
              <ActivityIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stats.todayActive}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam Aktivite
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#161F9C]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalActivities}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                En Aktif Stajyer
              </CardTitle>
              <Award className="h-4 w-4 text-[#00D9FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-900 truncate">
                {stats.mostActiveIntern.name}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.mostActiveIntern.count} aktivite
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Grafikler */}
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
                  <p className="text-gray-500">Veri yükleniyor...</p>
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
                  <p className="text-gray-500">Veri yükleniyor...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Son Aktiviteler */}
        <Card>
          <CardHeader>
            <CardTitle>Son Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Stajyer</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      Henüz aktivite bulunmuyor
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivities.map((activity) => (
                    <TableRow key={activity.$id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(activity.date), 'd MMMM yyyy', { locale: tr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {activity.userName || 'Bilinmeyen'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{activity.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
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
