import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
    const response = NextResponse.json({
        cookies: request.cookies.getAll(),
    });

    // Try to set a test cookie
    response.cookies.set("test-cookie", "hello", {
        domain: ".personalapp.id",
        path: "/",
        secure: true,
        sameSite: "none",
        httpOnly: true,
    });

    return response;
}
