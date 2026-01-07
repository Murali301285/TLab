import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public paths
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/', '/assets', '/favicon.ico'];
    if (publicPaths.some(path => pathname.startsWith(path)) || pathname.match(/\.(.*)$/)) {
        return NextResponse.next();
    }

    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
        // Redirect to login
        return NextResponse.redirect(new URL('/', req.url));
    }

    try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.next();
    } catch (error) {
        // Invalid token
        return NextResponse.redirect(new URL('/', req.url));
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
