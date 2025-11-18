import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth gerektirmeyen sayfalar
const PUBLIC_ROUTES = ['/login', '/register'];

// Sadece yöneticilerin erişebileceği sayfalar
const ADMIN_ONLY_ROUTES = ['/dashboard', '/students'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public route kontrolü
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  
  // Cookie'den session kontrolü (Appwrite session cookie'si)
  const session = request.cookies.get('a_session_' + (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''));
  
  // Eğer kullanıcı giriş yapmamışsa ve public route değilse login'e yönlendir
  if (!session && !isPublicRoute && pathname !== '/') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Eğer kullanıcı giriş yapmışsa ve login/register sayfasına gitmeye çalışıyorsa dashboard'a yönlendir
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/activities', request.url));
  }
  
  // Admin route kontrolü burada yapılabilir ama rol bilgisi cookie'de olmadığı için
  // sayfa içinde kontrol yapacağız
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
