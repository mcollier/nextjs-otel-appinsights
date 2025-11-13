import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Debug endpoint for testing client logger',
    timestamp: new Date().toISOString(),
    instructions: [
      '1. Open browser developer tools',
      '2. Go to Console tab', 
      '3. Look for "[CLIENT]" messages',
      '4. Check Application Insights in Azure Portal after 2-5 minutes'
    ]
  });
}