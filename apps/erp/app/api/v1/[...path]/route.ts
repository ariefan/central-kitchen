import { NextRequest, NextResponse } from "next/server";

// API backend URL - use environment variable or default to localhost
const API_URL = process.env.API_SERVICE_URL || "http://localhost:8000";

/**
 * Proxy handler for all API requests
 * This ensures reliable proxying in Next.js standalone mode
 */
async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = new URL(request.url);
  const targetUrl = `${API_URL}/api/v1/${pathString}${url.search}`;

  // Get request headers and forward them
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header as it will be set by fetch
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  // Forward cookies
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  try {
    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD"
        ? await request.text()
        : undefined,
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
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[API Proxy] Error proxying request:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to API backend" },
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
