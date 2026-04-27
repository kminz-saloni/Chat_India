/**
 * API Proxy - Forwards requests from frontend to backend
 * This solves CORS and mixed-content issues in Codespaces
 * Routes /api/* -> http://localhost:5000/api/*
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

console.log('[API Proxy] Backend URL configured:', BACKEND_URL);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = '/api/' + (path || []).join('/');

  try {
    const body = await request.text();
    console.log(`[API Proxy] POST ${endpoint}`, body.slice(0, 100));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: body || undefined,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[API Proxy] Parse error for endpoint ${endpoint}:`, responseText.slice(0, 200));
      console.error('Parse error:', e);
      return NextResponse.json({ error: 'Invalid response from backend', details: responseText.slice(0, 100) }, { status: 500 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] POST Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = '/api/' + (path || []).join('/');
  const searchParams = request.nextUrl.search;

  try {
    console.log(`[API Proxy] GET ${endpoint}${searchParams}`);

    const headers: Record<string, string> = {};

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}${searchParams}`, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: 'Invalid response from backend' }, { status: 500 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] GET Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = '/api/' + (path || []).join('/');

  try {
    console.log(`[API Proxy] DELETE ${endpoint}`);
    
    const headers: Record<string, string> = {};

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] DELETE Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const endpoint = '/api/' + (path || []).join('/');

  try {
    const body = await request.text();
    console.log(`[API Proxy] PATCH ${endpoint}`, body.slice(0, 100));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: body || undefined,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] PATCH Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
