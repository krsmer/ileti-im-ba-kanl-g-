'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getCurrentUser, getActivityByUser, deleteActivity } from '@/lib/appwrite';
import type { Activity } from '@/lib/appwrite';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Calendar, Tag, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [activityToDelete, setActivityToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadActivities = React.useCallback(async () => {
    try {
      const userResult = await getCurrentUser();
      
      if (!userResult.success || !userResult.data) {
        router.push('/login');
        return;
      }

      setUserId(userResult.data.$id);
      
      const activitiesResult = await getActivityByUser(userResult.data.$id);
      
      if (activitiesResult.success && activitiesResult.data) {
        const activitiesData = activitiesResult.data.documents.map((doc: any) => ({
          $id: doc.$id,
          userId: doc.userId,
          userName: doc.userName,
          category: doc.category,
          description: doc.description,
          date: doc.date,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
          managerComment: doc.managerComment,
        }));
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleDeleteClick = (activityId: string) => {
    setActivityToDelete(activityId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteActivity(activityToDelete);
      
      if (result.success) {
        toast.success('Aktivite silindi');
        await loadActivities();
      } else {
        toast.error(result.error || 'Aktivite silinemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Yazılım': 'bg-blue-500',
      'Tasarım': 'bg-purple-500',
      'Analiz': 'bg-green-500',
      'Toplantı': 'bg-yellow-500',
      'Eğitim': 'bg-red-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-heading font-bold">Aktivitelerim</h1>
            <p className="text-muted-foreground">
              Tüm aktivitelerinizi görüntüleyin ve yönetin
            </p>
          </div>
          <Button asChild className="bg-[#161F9C] hover:bg-[#1a23b0]">
            <Link href="/activities/new">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Aktivite
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Toplam Aktivite
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bu Hafta
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activities.filter(a => {
                  const activityDate = new Date(a.date);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return activityDate > weekAgo;
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Kategoriler
              </CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(activities.map(a => a.category)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aktivite Listesi</CardTitle>
            <CardDescription>
              Son eklenen aktiviteleriniz tarih sırasına göre
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Henüz aktivite eklemediniz
                </p>
                <Button asChild className="bg-[#161F9C] hover:bg-[#1a23b0]">
                  <Link href="/activities/new">
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Aktivitenizi Ekleyin
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.$id}>
                      <TableCell className="font-medium">
                        {format(new Date(activity.date), 'dd MMMM yyyy', { locale: tr })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(activity.category)}>
                          {activity.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{activity.description}</p>
                        {activity.managerComment && (
                          <p className="text-sm text-gray-500 mt-1">
                            Yönetici Yorumu: {activity.managerComment}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/activities/${activity.$id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Edit className="h-4 w-4" />
                              Düzenle
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(activity.$id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Sil
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aktiviteyi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu aktiviteyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Siliniyor...' : 'Sil'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
