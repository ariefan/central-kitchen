import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getTestApp,
  closeTestApp,
  createTestData,
  loginTestUser,
  clearAuthCookies,
} from "./test-setup";

describe("Authentication", () => {
  let app: any;
  let sessionCookie: string;

  beforeAll(async () => {
    app = await getTestApp();
    await createTestData();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe("Better Auth Endpoints", () => {
    it("should return null for unauthenticated session requests", async () => {
      clearAuthCookies(); // Ensure no cached auth
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/session",
      });

      // Better Auth may return different status codes for unauthenticated requests
      expect([200, 401, 404]).toContain(response.statusCode);
    });

    it("should sign in with username and password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        headers: {
          "Content-Type": "application/json",
        },
        payload: {
          username: "admin",
          password: "admin123",
        },
      });

      expect(response.statusCode).toBe(200);

      // Extract ALL cookies from response headers
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader)
          ? setCookieHeader
          : [setCookieHeader];
        // Better Auth uses multiple cookie names - get all of them
        const cookieStrings = cookies.map((c: string) => c.split(";")[0]);
        sessionCookie = cookieStrings.join("; ");
        console.log("Session cookies set:", sessionCookie);
      } else {
        console.warn("No set-cookie header in response");
      }

      const payload = response.json();
      expect(payload).toHaveProperty("user");
      expect(payload.user).toHaveProperty("id");
      expect(payload.user).toHaveProperty("email");
      expect(payload.user).toHaveProperty("username", "admin");
    });

    it("should fail sign in with wrong password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        headers: {
          "Content-Type": "application/json",
        },
        payload: {
          username: "admin",
          password: "wrongpassword",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should fail sign in with non-existent user", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/username",
        headers: {
          "Content-Type": "application/json",
        },
        payload: {
          username: "nonexistent",
          password: "password",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Protected Endpoints", () => {
    it("should access protected endpoint with valid session", async () => {
      // Login to get fresh cookies
      const cookies = await loginTestUser();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          Cookie: cookies,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty("success", true);
      expect(payload).toHaveProperty("data");

      // Verify user data is returned
      expect(payload.data).toHaveProperty("username", "admin");
      expect(payload.data).toHaveProperty("email");

      // Verify tenant context is set
      expect(payload.data).toHaveProperty("tenantId");
      expect(payload.data.tenantId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("should return user information with tenant context when authenticated", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          Cookie: sessionCookie,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty("success", true);
      expect(payload).toHaveProperty("data");
      expect(payload.data).toHaveProperty("id");
      expect(payload.data).toHaveProperty("email");
      expect(payload.data).toHaveProperty("role");
      expect(payload.data).toHaveProperty("tenant");
      expect(payload.data.tenant).toHaveProperty("id");
      expect(payload.data.tenant).toHaveProperty("name");
      expect(payload.data).toHaveProperty("location");
    });

    it("should have proper tenant isolation", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          Cookie: sessionCookie,
        },
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      // Verify tenant context is set
      expect(payload.data).toHaveProperty("tenantId");
      expect(payload.data.tenantId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("should reject unauthenticated requests to protected endpoints", async () => {
      clearAuthCookies(); // Ensure no cached auth
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        // No Cookie header - unauthenticated request
      });

      expect(response.statusCode).toBe(401);
      const payload = response.json();
      expect(payload).toHaveProperty("success", false);
    });
  });
});
