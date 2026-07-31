import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://127.0.0.1:8000';

async function proxyRequest(request: NextRequest, params: { path?: string[] }) {
    const pathSegments = params.path ?? [];
    const targetPath = pathSegments.length > 0 ? `/api/${pathSegments.join('/')}` : '/api';
    const targetUrl = new URL(`${targetPath}${request.nextUrl.search}`, API_BASE_URL);

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.set('accept', headers.get('accept') || 'application/json');

    const init: RequestInit = {
        method: request.method,
        headers,
        redirect: 'manual',
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
        init.body = await request.text();
    }

    const upstream = await fetch(targetUrl, init);
    const responseBody = await upstream.text();

    return new NextResponse(responseBody, {
        status: upstream.status,
        headers: {
            'content-type': upstream.headers.get('content-type') || 'application/json',
            'cache-control': 'no-store',
        },
    });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(request, await params);
}
