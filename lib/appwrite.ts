import { Client, Account, Databases, ID, Query, Models } from 'appwrite';
import { format } from 'date-fns';

// Appwrite yapılandırması
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
export const ACTIVITIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION_ID || '';
export const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || '';

// Tip tanımlamaları
export interface Activity {
  $id?: string;
  userId: string;
  userName?: string;
  category: string;
  description: string;
  date: string;
  participantIds: string[];
  participantNames?: string[];
  managerComment?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface UserProfile {
  $id?: string;
  userId: string;
  name: string;
  email: string;
  role: 'stajyer' | 'yonetici';
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $collectionId?: string;
  $databaseId?: string;
}

// AUTH FONKSİYONLARI

/**
 * Kullanıcı girişi
 */
export async function login(email: string, password: string) {
  try {
    // Önce tüm mevcut session'ları temizle
    try {
      const sessions = await account.listSessions();
      for (const session of sessions.sessions) {
        try {
          await account.deleteSession({ sessionId: session.$id });
        } catch {
          // Session silinemezse devam et
        }
      }
    } catch {
      // Session listesi alınamazsa devam et
    }
    
    // Yeni session oluştur
    const session = await account.createEmailPasswordSession({ email, password });
    return { success: true, data: session };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Giriş başarısız' };
  }
}

/**
 * Kullanıcı kaydı
 */
export async function register(email: string, password: string, name: string) {
  try {
    // Önce tüm mevcut session'ları temizle
    try {
      const sessions = await account.listSessions();
      for (const session of sessions.sessions) {
        try {
          await account.deleteSession({ sessionId: session.$id });
        } catch {
          // Session silinemezse devam et
        }
      }
    } catch {
      // Session listesi alınamazsa devam et
    }
    
    // Kullanıcı oluştur
    const user = await account.create({ 
      userId: ID.unique(), 
      email, 
      password, 
      name 
    });
    
    // Otomatik giriş yap
    await account.createEmailPasswordSession({ email, password });
    
    // Kullanıcı profili oluştur (varsayılan rol: stajyer)
    const profile = await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      documentId: ID.unique(),
      data: {
        userId: user.$id,
        name: name,
        email: email,
        role: 'stajyer'
      }
    });
    
    return { success: true, data: { user, profile } };
  } catch (error: any) {
    console.error('Register error:', error);
    return { success: false, error: error.message || 'Kayıt başarısız' };
  }
}

/**
 * Çıkış yap
 */
export async function logout() {
  try {
    await account.deleteSession({ sessionId: 'current' });
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message || 'Çıkış başarısız' };
  }
}

/**
 * Mevcut kullanıcıyı getir
 */
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message || 'Kullanıcı bulunamadı' };
  }
}

/**
 * Kullanıcı profilini getir
 */
export async function getUserProfile(userId?: string): Promise<UserProfile> {
  try {
    const response = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      queries: [Query.equal('userId', userId || '')]
    });
    
    if (response.documents.length === 0) {
      throw new Error('Profil bulunamadı');
    }
    
    const doc = response.documents[0];
    const profile: UserProfile = {
      $id: doc.$id,
      userId: doc.userId as string,
      name: doc.name as string,
      email: doc.email as string,
      role: doc.role as 'stajyer' | 'yonetici',
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
      $permissions: doc.$permissions,
      $collectionId: doc.$collectionId,
      $databaseId: doc.$databaseId,
    };
    
    return profile;
  } catch (error: any) {
    console.error('Get user profile error:', error);
    throw error;
  }
}

/**
 * Tüm stajyerleri listele
 */
export async function listAllInterns() {
  try {
    const response = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      queries: [Query.equal('role', 'stajyer')]
    });
    return { success: true, data: response };
  } catch (error: any) {
    console.error('List all interns error:', error);
    return { success: false, error: error.message || 'Stajyerler getirilemedi' };
  }
}

/**
 * Belirli kullanıcı ID'lerine göre profilleri getir
 */
export async function getUserProfilesByIds(userIds: string[]): Promise<Record<string, UserProfile>> {
  try {
    const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
    if (uniqueIds.length === 0) {
      return {};
    }

    const response = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      queries: [Query.equal('userId', uniqueIds)]
    });

    const profiles: Record<string, UserProfile> = {};
    response.documents.forEach((doc: any) => {
      profiles[doc.userId as string] = {
        $id: doc.$id,
        userId: doc.userId as string,
        name: doc.name as string,
        email: doc.email as string,
        role: doc.role as 'stajyer' | 'yonetici',
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
        $permissions: doc.$permissions,
        $collectionId: doc.$collectionId,
        $databaseId: doc.$databaseId,
      };
    });

    return profiles;
  } catch (error: any) {
    console.error('Get user profiles by ids error:', error);
    return {};
  }
}

/**
 * Kullanıcı profilini güncelle
 */
export async function updateUserProfile(documentId: string, data: { name?: string }) {
  try {
    const response = await databases.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      documentId: documentId,
      data: data
    });
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Update user profile error:', error);
    return { success: false, error: error.message || 'Profil güncellenemedi' };
  }
}

/**
 * Kullanıcı şifresini güncelle
 */
export async function updatePassword(oldPassword: string, newPassword: string) {
  try {
    await account.updatePassword({ password: newPassword, oldPassword: oldPassword });
    return { success: true };
  } catch (error: any) {
    console.error('Update password error:', error);
    return { success: false, error: error.message || 'Şifre güncellenemedi' };
  }
}

// AKTİVİTE FONKSİYONLARI

/**
 * Aktivite oluştur
 */
export async function createActivity(activityData: Omit<Activity, '$id' | '$createdAt' | '$updatedAt'>) {
  try {
    const activity = await databases.createDocument({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      documentId: ID.unique(),
      data: activityData
    });
    return { success: true, data: activity };
  } catch (error: any) {
    console.error('Create activity error:', error);
    return { success: false, error: error.message || 'Aktivite oluşturulamadı' };
  }
}

/**
 * Tüm aktiviteleri listele (yönetici için)
 */
export async function listAllActivities(limit = 100, offset = 0) {
  try {
    const activities = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [
        Query.orderDesc('date'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    });
    return { success: true, data: activities };
  } catch (error: any) {
    console.error('List all activities error:', error);
    return { success: false, error: error.message || 'Aktiviteler getirilemedi' };
  }
}

/**
 * Kullanıcıya özel aktiviteleri getir
 */
export async function getActivityByUser(userId: string, limit = 100) {
  try {
    const [ownerActivities, participantActivities] = await Promise.all([
      databases.listDocuments({
        databaseId: DATABASE_ID,
        collectionId: ACTIVITIES_COLLECTION_ID,
        queries: [
          Query.equal('userId', userId),
          Query.orderDesc('date'),
          Query.limit(limit)
        ]
      }),
      databases.listDocuments({
        databaseId: DATABASE_ID,
        collectionId: ACTIVITIES_COLLECTION_ID,
        queries: [
          Query.contains('participantIds', userId),
          Query.orderDesc('date'),
          Query.limit(limit)
        ]
      })
    ]);

    type ActivityDoc = Models.Document & { date?: string };
    const documentsMap = new Map<string, ActivityDoc>();
    [...ownerActivities.documents, ...participantActivities.documents].forEach((doc) => {
      documentsMap.set(doc.$id, doc as ActivityDoc);
    });

    const mergedDocuments = Array.from(documentsMap.values()).sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    const documents = mergedDocuments.slice(0, limit);

    return {
      success: true,
      data: {
        ...ownerActivities,
        documents,
        total: mergedDocuments.length,
      },
    };
  } catch (error: any) {
    console.error('Get activity by user error:', error);
    return { success: false, error: error.message || 'Aktiviteler getirilemedi' };
  }
}

/**
 * Aktiviteleri listele (genel)
 */
export async function listActivities(queries: string[] = []) {
  try {
    const activities = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [Query.orderDesc('date'), ...queries]
    });
    return { success: true, data: activities };
  } catch (error: any) {
    console.error('List activities error:', error);
    return { success: false, error: error.message || 'Aktiviteler getirilemedi' };
  }
}

/**
 * Aktivite sil
 */
export async function deleteActivity(activityId: string) {
  try {
    await databases.deleteDocument({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      documentId: activityId
    });
    return { success: true };
  } catch (error: any) {
    console.error('Delete activity error:', error);
    return { success: false, error: error.message || 'Aktivite silinemedi' };
  }
}

/**
 * Aktivite güncelle
 */
export async function updateActivity(activityId: string, data: Partial<Activity>) {
  try {
    const activity = await databases.updateDocument({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      documentId: activityId,
      data
    });
    return { success: true, data: activity };
  } catch (error: any) {
    console.error('Update activity error:', error);
    return { success: false, error: error.message || 'Aktivite güncellenemedi' };
  }
}

// İSTATİSTİK FONKSİYONLARI

/**
 * Toplam stajyer sayısını getir
 */
export async function getTotalInterns(): Promise<number> {
  try {
    const response = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      queries: [Query.equal('role', 'stajyer')]
    });
    return response.total;
  } catch (error: any) {
    console.error('Get total interns error:', error);
    return 0;
  }
}

/**
 * Bugün aktivite giren stajyer sayısını getir
 */
export async function getTodayActiveInterns(): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const activities = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [Query.greaterThanEqual('date', todayISO)]
    });
    
    // Benzersiz kullanıcı sayısı
    const uniqueUsers = new Set(activities.documents.map((doc: any) => doc.userId));
    return uniqueUsers.size;
  } catch (error: any) {
    console.error('Get today active interns error:', error);
    return 0;
  }
}

/**
 * Toplam aktivite sayısını getir
 */
export async function getTotalActivities(): Promise<number> {
  try {
    const response = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [Query.limit(1)]
    });
    return response.total;
  } catch (error: any) {
    console.error('Get total activities error:', error);
    return 0;
  }
}

/**
 * En aktif stajyeri getir
 */
export async function getMostActiveIntern(): Promise<{ name: string; count: number }> {
  try {
    const activities = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [Query.limit(1000)]
    });
    
    // Kullanıcı başına aktivite sayısını hesapla
    const activityCount: { [key: string]: { count: number; userName: string } } = {};
    
    activities.documents.forEach((doc: any) => {
      const userId = doc.userId;
      const userName = doc.userName || 'Bilinmeyen';
      
      if (!activityCount[userId]) {
        activityCount[userId] = { count: 0, userName };
      }
      activityCount[userId].count++;
    });
    
    // En yüksek sayıyı bul
    let maxCount = 0;
    let mostActiveUser = { name: 'Henüz yok', count: 0 };
    let mostActiveUserId: string | null = null;
    
    Object.entries(activityCount).forEach(([userId, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostActiveUser = { name: data.userName, count: data.count };
        mostActiveUserId = userId;
      }
    });
    
    if (mostActiveUserId) {
      try {
        const profiles = await getUserProfilesByIds([mostActiveUserId]);
        if (profiles[mostActiveUserId]) {
          mostActiveUser.name = profiles[mostActiveUserId].name;
        }
      } catch (profileError) {
        console.error('Most active intern profile fetch error:', profileError);
      }
    }

    return mostActiveUser;
  } catch (error: any) {
    console.error('Get most active intern error:', error);
    return { name: 'Henüz yok', count: 0 };
  }
}

/**
 * Kategori dağılımını getir
 */
export async function getCategoryDistribution() {
  try {
    const activities = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [Query.limit(1000)]
    });
    
    const distribution: { [key: string]: number } = {};
    
    activities.documents.forEach((doc: any) => {
      const category = doc.category || 'Diğer';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    
    return { success: true, data: distribution };
  } catch (error: any) {
    console.error('Get category distribution error:', error);
    return { success: false, error: error.message || 'Kategori dağılımı getirilemedi' };
  }
}

/**
 * Son N günün aktivite sayısını getir
 */
export async function getActivityTimeline(days: number = 7) {
  try {
    const activities = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: ACTIVITIES_COLLECTION_ID,
      queries: [Query.limit(1000), Query.orderDesc('date')]
    });

    const formatDateKey = (value: string | Date) => {
      const date = typeof value === 'string' ? new Date(value) : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      return format(date, 'yyyy-MM-dd');
    };

    const buildTimelineKeys = (count: number) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const keys: string[] = [];

      for (let i = count - 1; i >= 0; i--) {
        const cursor = new Date(today);
        cursor.setDate(cursor.getDate() - i);
        keys.push(formatDateKey(cursor));
      }

      return keys;
    };

    const timelineKeys = buildTimelineKeys(days);
    
    const timeline: { [key: string]: number } = {};
    timelineKeys.forEach((key) => {
      timeline[key] = 0;
    });

    activities.documents.forEach((doc: any) => {
      const activityDate = formatDateKey(doc.date);
      if (activityDate && timeline.hasOwnProperty(activityDate)) {
        timeline[activityDate]++;
      }
    });

    return { success: true, data: timeline, labels: timelineKeys };
  } catch (error: any) {
    console.error('Get activity timeline error:', error);
    return { success: false, error: error.message || 'Aktivite zaman çizelgesi getirilemedi' };
  }
}

export { client };
