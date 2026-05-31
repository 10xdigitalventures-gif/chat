import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // Public routes
  const publicRoutes = [
    '/api/auth/login/step1',
    '/api/auth/login/step2',
    '/api/auth/refresh',
    '/api/auth/external-login',
    '/api/auth/forgot-password',
    '/api/auth/verify-reset-token',
    '/api/auth/reset-password',
  ];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // Role-based access control
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/admin') && payload.role !== 'Admin Role') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }
  if (pathname.startsWith('/api/consultant') && !['Consultant Role', 'Admin Role'].includes(payload.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }
  if (pathname.startsWith('/api/user') && !['Client Role', 'Admin Role', 'Consultant Role'].includes(payload.role)) {
     // Some user routes might be public, e.g., browsing consultants
     const publicUserRoutes = [
         '/api/user/consultants',
     ];
     if (!publicUserRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
     }
  }

  // Clone headers to pass user info to the route handler
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: '/api/:path*',
};
