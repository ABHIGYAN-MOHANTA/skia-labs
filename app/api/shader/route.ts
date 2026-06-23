import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the Redis client. 
// This will automatically connect using the REDIS_URL environment variable.
const redis = new Redis(process.env.REDIS_URL || '');

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    try {
        const code = await redis.get(`shader:${id}`);
        if (code === null) {
            return NextResponse.json({ error: 'Shader not found' }, { status: 404 });
        }
        return NextResponse.json({ code });
    } catch (error) {
        console.error('Error fetching from Redis:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { id, code } = await req.json();

        if (!id || !code) {
            return NextResponse.json({ error: 'Missing id or code' }, { status: 400 });
        }

        await redis.set(`shader:${id}`, code);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving to Redis:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
