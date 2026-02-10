import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public paths
    // Public paths
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/assets', '/favicon.ico'];

    // Explicitly allow root (Login Page)
    if (pathname === '/' || publicPaths.some(path => pathname.startsWith(path)) || pathname.match(/\.(.*)$/)) {
        return NextResponse.next();
    }

    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
        // Redirect to login
        return NextResponse.redirect(new URL('/', req.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Super Admin & Company Admin Protection
        if (pathname.startsWith('/admin/configurations')) {
            if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'COMPANY_ADMIN') {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }

        // Companies list is strictly Super Admin
        if (pathname.startsWith('/admin/companies')) {
            if (payload.role !== 'SUPER_ADMIN') {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }

        return NextResponse.next();
    } catch (error) {
        // Invalid token
        const response = NextResponse.redirect(new URL('/', req.url));
        response.cookies.delete('auth-token');
        return response;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
