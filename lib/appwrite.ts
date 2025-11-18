import { Client, Account, Databases, ID, Query, Models } from 'appwrite';

// Appwrite yapılandırması
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);

// Database ve Collection ID'leri
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
    const session = await account.createEmailPasswordSession(email, password);
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
    // Kullanıcı oluştur
    const user = await account.create(ID.unique(), email, password, name);
    
    // Otomatik giriş yap
    await account.createEmailPasswordSession(email, password);
    
    // Kullanıcı profili oluştur (varsayılan rol: stajyer)
    const profile = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      {
        userId: user.$id,
        name: name,
        email: email,
        role: 'stajyer'
      }
    );
    
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
    await account.deleteSession('current');
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
export async function getUserProfile(userId: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );
    
    if (response.documents.length === 0) {
      return { success: false, error: 'Profil bulunamadı' };
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
    
    return { success: true, data: profile };
  } catch (error: any) {
    console.error('Get user profile error:', error);
    return { success: false, error: error.message || 'Profil getirilemedi' };
  }
}

// AKTİVİTE FONKSİYONLARI

/**
 * Aktivite oluştur
 */
export async function createActivity(activityData: Omit<Activity, '$id' | '$createdAt' | '$updatedAt'>) {
  try {
    const activity = await databases.createDocument(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      ID.unique(),
      activityData
    );
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
    const activities = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [
        Query.orderDesc('date'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
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
    const activities = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.orderDesc('date'),
        Query.limit(limit)
      ]
    );
    return { success: true, data: activities };
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
    const activities = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [Query.orderDesc('date'), ...queries]
    );
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
    await databases.deleteDocument(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      activityId
    );
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
    const activity = await databases.updateDocument(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      activityId,
      data
    );
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
export async function getTotalInterns() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('role', 'stajyer')]
    );
    return { success: true, data: response.total };
  } catch (error: any) {
    console.error('Get total interns error:', error);
    return { success: false, error: error.message || 'Stajyer sayısı getirilemedi' };
  }
}

/**
 * Bugün aktivite giren stajyer sayısını getir
 */
export async function getTodayActiveInterns() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const activities = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [Query.greaterThanEqual('date', todayISO)]
    );
    
    // Benzersiz kullanıcı sayısı
    const uniqueUsers = new Set(activities.documents.map((doc: any) => doc.userId));
    return { success: true, data: uniqueUsers.size };
  } catch (error: any) {
    console.error('Get today active interns error:', error);
    return { success: false, error: error.message || 'Aktif stajyer sayısı getirilemedi' };
  }
}

/**
 * Toplam aktivite sayısını getir
 */
export async function getTotalActivities() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [Query.limit(1)]
    );
    return { success: true, data: response.total };
  } catch (error: any) {
    console.error('Get total activities error:', error);
    return { success: false, error: error.message || 'Aktivite sayısı getirilemedi' };
  }
}

/**
 * En aktif stajyeri getir
 */
export async function getMostActiveIntern() {
  try {
    const activities = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [Query.limit(1000)]
    );
    
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
    let mostActiveUser = { userId: '', userName: 'Henüz yok', count: 0 };
    
    Object.entries(activityCount).forEach(([userId, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostActiveUser = { userId, userName: data.userName, count: data.count };
      }
    });
    
    return { success: true, data: mostActiveUser };
  } catch (error: any) {
    console.error('Get most active intern error:', error);
    return { success: false, error: error.message || 'En aktif stajyer getirilemedi' };
  }
}

/**
 * Kategori dağılımını getir
 */
export async function getCategoryDistribution() {
  try {
    const activities = await databases.listDocuments(
      DATABASE_ID,
      ACTIVITIES_COLLECTION_ID,
      [Query.limit(1000)]
    );
    
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

export { client };
