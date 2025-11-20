import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getTestApp,
  closeTestApp,
  createTestData,
} from './test-setup.js';

describe('AUTH-003: User Profile Management', () => {
  let app: any;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await getTestApp();
    await createTestData();

    // Sign in with admin user
    const signinRes = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/username',
      payload: {
        username: 'admin',
        password: 'admin123',
      },
    });

    expect(signinRes.statusCode).toBe(200);

    // Extract session cookie
    const cookies = signinRes.headers['set-cookie'];
    const sessionCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('better-auth'))
      : cookies;
    authToken = sessionCookie || '';

    // Get user ID from /me endpoint
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: authToken,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meData = meRes.json();
    userId = meData.data.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('should update user profile name', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'John Updated Doe',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.firstName).toBe('John');
      expect(data.data.lastName).toBe('Updated Doe');
      expect(data.message).toBe('Profile updated successfully');
    });

    it('should update user profile phone', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          phone: '+1234567890',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.phone).toBe('+1234567890');
    });

    it('should update user profile photo URL', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          photoUrl: 'https://example.com/photo.jpg',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.image).toBe('https://example.com/photo.jpg');
    });

    it('should update notification preferences', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          notificationPreferences: {
            emailNotifications: true,
            pushNotifications: false,
            smsNotifications: true,
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      // Metadata field stores notification preferences as JSONB
      if (data.data.metadata) {
        expect(data.data.metadata).toEqual({
          emailNotifications: true,
          pushNotifications: false,
          smsNotifications: true,
        });
      }
    });

    it('should update multiple profile fields at once', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
        payload: {
          name: 'Jane Smith',
          phone: '+9876543210',
          photoUrl: 'https://example.com/jane.jpg',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.firstName).toBe('Jane');
      expect(data.data.lastName).toBe('Smith');
      expect(data.data.phone).toBe('+9876543210');
      expect(data.data.image).toBe('https://example.com/jane.jpg');
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        payload: {
          name: 'Unauthorized User',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/me/photo', () => {
    it('should upload profile photo', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/photo',
        headers: {
          cookie: authToken,
        },
        payload: {
          photoUrl: 'https://example.com/new-photo.jpg',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data.image).toBe('https://example.com/new-photo.jpg');
      expect(data.message).toBe('Photo uploaded successfully');
    });

    it('should validate photo URL format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/photo',
        headers: {
          cookie: authToken,
        },
        payload: {
          photoUrl: 'not-a-valid-url',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/photo',
        payload: {
          photoUrl: 'https://example.com/photo.jpg',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/me/change-password', () => {
    it('should change password with valid current password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/change-password',
        headers: {
          cookie: authToken,
        },
        payload: {
          currentPassword: 'admin123',
          newPassword: 'newPassword123!',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password changed successfully');

      // Change it back for other tests
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/change-password',
        headers: {
          cookie: authToken,
        },
        payload: {
          currentPassword: 'newPassword123!',
          newPassword: 'admin123',
        },
      });
    });

    it('should reject incorrect current password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/change-password',
        headers: {
          cookie: authToken,
        },
        payload: {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123!',
        },
      });

      expect(res.statusCode).toBe(400);
      const data = res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
      expect(data.message).toBe('Current password is incorrect');
    });

    it('should validate new password length', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/change-password',
        headers: {
          cookie: authToken,
        },
        payload: {
          currentPassword: 'admin123',
          newPassword: 'short',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/me/change-password',
        payload: {
          currentPassword: 'admin123',
          newPassword: 'newPassword123!',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile with all fields', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: authToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('email');
      expect(data.data).toHaveProperty('firstName');
      expect(data.data).toHaveProperty('lastName');
      expect(data.data).toHaveProperty('phone');
      expect(data.data).toHaveProperty('role');
      expect(data.data).toHaveProperty('tenant');
      expect(data.data).toHaveProperty('location');
      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');
    });
  });
});
