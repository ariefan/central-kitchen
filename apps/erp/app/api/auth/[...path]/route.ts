import { NextRequest, NextResponse } from "next/server";

// API backend URL - use environment variable or default to localhost
const API_URL = process.env.API_SERVICE_URL || "http://localhost:8000";

/**
 * Proxy handler for Better Auth requests
 * Forwards all /api/auth/* requests to the backend
 */
async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = new URL(request.url);
  // Backend has Better Auth at /auth/* (not /api/auth/*)
  const targetUrl = `${API_URL}/auth/${pathString}${url.search}`;

  // Get request headers and forward them
  const headers = new Headers();
  const originalHost = request.headers.get("host") || "erp.personalapp.id";

  request.headers.forEach((value, key) => {
    // Skip host header as it will be set by fetch
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  // Forward proxy headers so backend knows the original request details
  headers.set("X-Forwarded-Host", originalHost);
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Real-IP", request.headers.get("x-forwarded-for")?.split(",")[0] || "");

  // Forward cookies
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  try {
    // Get request body for non-GET requests
    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // Don't follow redirects - let the client handle them
      redirect: "manual",
    });

    // Create response with headers from backend
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Forward all headers except some that shouldn't be forwarded
      if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // Get response body
    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Auth Proxy] Error proxying request:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to auth backend" },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}
