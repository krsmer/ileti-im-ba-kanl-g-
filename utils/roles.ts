// Rol tanımlamaları
export const ROLES = {
  STAJYER: 'stajyer',
  YONETICI: 'yonetici',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Rol kontrol fonksiyonları
export function isStajyer(role: string): boolean {
  return role === ROLES.STAJYER;
}

export function isYonetici(role: string): boolean {
  return role === ROLES.YONETICI;
}

// Sayfa erişim kontrolü
export const PAGE_PERMISSIONS: Record<string, Role[]> = {
  '/dashboard': [ROLES.YONETICI],
  '/activities': [ROLES.STAJYER, ROLES.YONETICI],
  '/activities/new': [ROLES.STAJYER, ROLES.YONETICI],
  '/students/[id]': [ROLES.YONETICI],
};

/**
 * Kullanıcının belirli bir sayfaya erişim izni olup olmadığını kontrol eder
 */
export function canAccessPage(userRole: Role, pagePath: string): boolean {
  const permissions = PAGE_PERMISSIONS[pagePath];
  
  if (!permissions) {
    // Tanımlı olmayan sayfalar için default olarak erişime izin ver
    return true;
  }
  
  return permissions.includes(userRole);
}

/**
 * Yönetici yetkisi gerektirir
 */
export function requireYonetici(userRole: string): boolean {
  return isYonetici(userRole);
}

/**
 * Kullanıcının kendi verisine mi yoksa başkasının verisine mi erişmeye çalıştığını kontrol eder
 */
export function canAccessUserData(currentUserId: string, targetUserId: string, currentUserRole: Role): boolean {
  // Yönetici herkese erişebilir
  if (isYonetici(currentUserRole)) {
    return true;
  }
  
  // Stajyer sadece kendi verisine erişebilir
  return currentUserId === targetUserId;
}
