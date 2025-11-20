'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { 
  getCurrentUser, 
  getUserProfile, 
  listAllInterns,
  getActivityByUser,
} from '@/lib/appwrite';
import type { UserProfile } from '@/lib/appwrite';
import { toast } from 'sonner';
import { Eye, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function StudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<(UserProfile & { activityCount: number })[]>([]);

  useEffect(() => {
    const loadStudents = async () => {
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

        // Stajyerleri yükle
        const internsResult = await listAllInterns();
        if (internsResult.success && internsResult.data) {
          // Her stajyer için aktivite sayısını al
          const studentsWithCount = await Promise.all(
            internsResult.data.documents.map(async (doc: any) => {
              const activitiesResult = await getActivityByUser(doc.userId);
              const activityCount = activitiesResult.success && activitiesResult.data 
                ? activitiesResult.data.total 
                : 0;

              return {
                $id: doc.$id,
                userId: doc.userId as string,
                name: doc.name as string,
                email: doc.email as string,
                role: doc.role as 'stajyer' | 'yonetici',
                $createdAt: doc.$createdAt,
                $updatedAt: doc.$updatedAt,
                activityCount,
              };
            })
          );

          setStudents(studentsWithCount);
        }
      } catch (error) {
        console.error('Stajyerler yükleme hatası:', error);
        toast.error('Stajyerler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [router]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">
            Tüm Stajyerler
          </h1>
          <p className="text-gray-600 mt-1">
            {students.length} stajyer kayıtlı
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stajyer Listesi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stajyer</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">Aktivite Sayısı</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      Henüz stajyer bulunmuyor
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.$id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-[#161F9C] text-white text-xs">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{student.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {format(new Date(student.$createdAt || ''), 'd MMM yyyy', { locale: tr })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-semibold">
                          {student.activityCount} aktivite
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/students/${student.userId}`}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Detay
                          </Button>
                        </Link>
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
