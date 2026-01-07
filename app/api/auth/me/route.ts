
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 200 }); // Or 401
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Return minimal info needed for FE
        return NextResponse.json({
            user: {
                id: payload.userId,
                email: payload.email,
                role: payload.role
            }
        });

    } catch (error) {
        // Token invalid/expired
        return NextResponse.json({ user: null }, { status: 200 });
    }
}
