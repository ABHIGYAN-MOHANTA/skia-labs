import { NextRequest, NextResponse } from 'next/server';
import { fallbackBgBase64 } from './fallbackBg';

const fallbackSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <!-- Pink to Blue gradient matching the homepage -->
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ec4899" />
            <stop offset="50%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
        
        <filter id="textShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur" />
            <feFlood flood-color="#000000" flood-opacity="0.8" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feOffset dx="0" dy="6" in="shadow" result="offsetShadow" />
            
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur2" />
            <feFlood flood-color="#000000" flood-opacity="0.9" result="color2" />
            <feComposite in="color2" in2="blur2" operator="in" result="shadow2" />

            <feMerge>
                <feMergeNode in="offsetShadow" />
                <feMergeNode in="shadow2" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>

    <!-- Base background image from the user's pics folder -->
    <image href="${fallbackBgBase64}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" />

    <!-- Title -->
    <text x="600" y="270" font-family="'Geist Sans', 'Inter', system-ui, sans-serif" font-size="124" font-weight="900" fill="url(#textGrad)" filter="url(#textShadow)" text-anchor="middle" dominant-baseline="middle" letter-spacing="-3">Skia Labs</text>
    
    <!-- Subtitle matching homepage exactly -->
    <text x="600" y="380" font-family="'Geist Sans', 'Inter', system-ui, sans-serif" font-size="28" font-weight="500" fill="#f8fafc" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5" filter="url(#textShadow)">Write, test, and explore SKSL shaders in real-time. A powerful web-based</text>
    <text x="600" y="425" font-family="'Geist Sans', 'Inter', system-ui, sans-serif" font-size="28" font-weight="500" fill="#f8fafc" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5" filter="url(#textShadow)">playground for creative coding with Skia's shader language.</text>
</svg>`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return new NextResponse("Missing ID", { status: 400 });
    }



    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (!projectId) {
            throw new Error("Missing Firebase Project ID");
        }

        // Fetch from Firestore REST API (no auth needed for public reads)
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shader_thumbnails/${id}`;
        
        const response = await fetch(url, {
            // Revalidate every hour, or whatever cache policy fits
            next: { revalidate: 3600 } 
        });

        if (!response.ok) {
            return new NextResponse(fallbackSvg, { 
                status: 200, 
                headers: { 
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600'
                } 
            });
        }

        const data = await response.json();
        const base64Field = data.fields?.base64?.stringValue;

        if (!base64Field) {
            return new NextResponse(fallbackSvg, { 
                status: 200, 
                headers: { 
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600'
                } 
            });
        }

        // Base64 string from canvas.toDataURL looks like: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        const matches = base64Field.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            return new NextResponse(fallbackSvg, { 
                status: 200, 
                headers: { 
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'public, max-age=3600'
                } 
            });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const binaryData = Buffer.from(base64Data, 'base64');

        return new NextResponse(binaryData, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (err) {
        console.error('Error serving thumbnail:', err);
        return new NextResponse(fallbackSvg, { 
            status: 200, 
            headers: { 
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600'
            } 
        });
    }
}
