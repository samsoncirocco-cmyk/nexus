import { NextRequest, NextResponse } from 'next/server';

// Cloud Function endpoint for semantic search
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'https://us-central1-killuacode.cloudfunctions.net/semantic_search_api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    // Proxy request to the backend Cloud Function
    const res = await fetch(SEARCH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: q,
        // Pass through optional parameters if needed
        top_k: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
        source: searchParams.get('source') || undefined,
      }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Search API error: ${res.status} ${errorText}`);
        return NextResponse.json({ error: `Backend error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    
    // The frontend expects { results: [...] }
    // The backend returns { results: [...], ... } so we can just return data directly
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Search API Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

