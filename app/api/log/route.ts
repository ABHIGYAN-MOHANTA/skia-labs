import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
export async function POST(req: NextRequest) {
  const data = await req.json();
  fs.writeFileSync('crash.log', JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true });
}
