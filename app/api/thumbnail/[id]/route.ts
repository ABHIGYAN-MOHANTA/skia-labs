import { NextRequest, NextResponse } from 'next/server';
import { fallbackBgBase64 } from './fallbackBg';

function getFallbackResponse() {
    const matches = fallbackBgBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return new NextResponse("Fallback error", { status: 500 });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const binaryData = Buffer.from(base64Data, 'base64');
    return new NextResponse(binaryData, {
        status: 200,
        headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=3600'
        }
    });
}

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
            return getFallbackResponse();
        }

        const data = await response.json();
        const base64Field = data.fields?.base64?.stringValue;

        if (!base64Field) {
            return getFallbackResponse();
        }

        // Base64 string from canvas.toDataURL looks like: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        const matches = base64Field.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            return getFallbackResponse();
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
        return getFallbackResponse();
    }
}
