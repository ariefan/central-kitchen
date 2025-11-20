# ERP System

Enterprise Resource Planning (ERP) web application built with Next.js 16, React 19, and better-auth.

## Features

- **Authentication**: Secure login/register with better-auth
- **Session Management**: Automatic session handling with cookies
- **Protected Routes**: Middleware-based route protection
- **Multi-tenant Support**: Integrated with erp-api's multi-tenant architecture
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Running erp-api server (port 8000)

### Environment Variables

Create a `.env.local` file in the `apps/erp` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
BETTER_AUTH_URL=http://localhost:8000
BETTER_AUTH_SECRET=your-secure-random-secret-min-32-chars-change-in-production
```

### Installation

From the root of the monorepo:

```bash
pnpm install
```

### Development

Start the development server:

```bash
# From the root
pnpm dev:erp

# Or from apps/erp
cd apps/erp
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Build

Build for production:

```bash
# From the root
pnpm build --filter=erp

# Or from apps/erp
cd apps/erp
pnpm build
```

## Project Structure

```
apps/erp/
├── app/
│   ├── auth/          # Authentication pages (login/register)
│   ├── welcome/       # Protected welcome page
│   ├── layout.tsx     # Root layout with providers
│   └── page.tsx       # Root page (redirects)
├── components/
│   ├── auth/          # Authentication components
│   ├── providers/     # React Query provider
│   └── ui/            # shadcn/ui components
├── lib/
│   ├── auth-client.ts # better-auth client configuration
│   └── utils.ts       # Utility functions
├── middleware.ts      # Route protection middleware
└── .env.local         # Environment variables
```

## Authentication Flow

1. **Landing**: User visits `/` and is redirected to `/auth` or `/welcome` based on session
2. **Login/Register**: User can switch between login and register forms
3. **Session Creation**: better-auth creates a session cookie on successful auth
4. **Protected Routes**: Middleware checks session and redirects if needed
5. **Welcome Page**: Shows user information and session details

## API Integration

The app connects to the erp-api backend at `http://localhost:8000`:

- **Auth Endpoints**: `/api/auth/*` - Handled by better-auth
- **Custom Endpoints**: `/api/v1/auth/me` - Get current user info

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, shadcn/ui, Tailwind CSS v4
- **Authentication**: better-auth with username plugin
- **State Management**: TanStack React Query
- **Type Safety**: TypeScript
- **Styling**: Tailwind CSS with CSS variables

## Development Notes

### Adding New Routes

1. Create route in `app/` directory
2. Add route protection in `middleware.ts` if needed
3. Use `useSession()` hook to access user data

### Using Authentication

```tsx
import { useSession, authClient } from "@/lib/auth-client";

function MyComponent() {
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Hello {session.user.email}</div>;
}
```

### API Calls with Credentials

```tsx
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/...`, {
  credentials: "include", // Important: Include cookies
});
```

## Troubleshooting

### Session not persisting
- Ensure `credentials: "include"` is set in fetch calls
- Check that erp-api CORS allows `http://localhost:3000`
- Verify `BETTER_AUTH_URL` matches erp-api URL

### Middleware redirect loop
- Clear browser cookies
- Check middleware logic in `middleware.ts`
- Ensure session cookie name matches: `better-auth.session_token`

### API connection errors
- Verify erp-api is running on port 8000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Ensure database is running and migrated
