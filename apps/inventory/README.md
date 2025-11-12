# Inventory Management System

A modern inventory management application built with TanStack Start, React, and shadcn/ui.

## Tech Stack

- **Framework**: TanStack Start (React)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query
- **Form Handling**: TanStack Form
- **Virtualization**: TanStack Virtual
- **Package Manager**: pnpm

## Project Structure

```
src/
├── app/                    # App-specific configurations
├── components/             # Reusable React components
│   ├── features/          # Feature-specific components
│   │   ├── data-table.tsx
│   │   └── section-cards.tsx
│   ├── forms/             # Form components
│   │   └── login-form.tsx
│   ├── layout/            # Layout components
│   │   ├── app-sidebar.tsx
│   │   ├── site-header.tsx
│   │   ├── Header.tsx
│   │   ├── nav-documents.tsx
│   │   ├── nav-main.tsx
│   │   ├── nav-secondary.tsx
│   │   └── nav-user.tsx
│   ├── charts/            # Chart components
│   │   └── chart-area-interactive.tsx
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
│   └── use-mobile.ts
├── lib/                   # Utility libraries
│   └── utils.ts
├── pages/                 # Page components
├── routes/                # TanStack Router routes
│   ├── inventory/         # Inventory-related routes
│   ├── reports/           # Reports routes
│   ├── suppliers/         # Supplier management routes
│   └── auth/              # Authentication routes
├── services/              # API and service functions
├── types/                 # TypeScript type definitions
│   └── inventory.ts
├── utils/                 # Utility functions
├── styles.css             # Global styles
└── router.tsx             # Router configuration
```

## Features

- **Dashboard**: Overview of inventory metrics and quick actions
- **Product Management**: Add, edit, and delete products
- **Stock Tracking**: Monitor stock levels and low stock alerts
- **Supplier Management**: Manage supplier information
- **Reports**: Generate inventory and performance reports
- **Search & Filter**: Advanced search and filtering capabilities
- **Responsive Design**: Mobile-friendly interface

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Build

Build the application for production:

```bash
pnpm build
```

### Preview

Preview the production build:

```bash
pnpm preview
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Component Organization

### UI Components (`src/components/ui/`)
All shadcn/ui components are located here. These are reusable, low-level components.

### Feature Components (`src/components/features/`)
Business logic components that combine multiple UI components to create features.

### Layout Components (`src/components/layout/`)
Navigation, headers, sidebars, and other layout-related components.

### Form Components (`src/components/forms/`)
Form-specific components using TanStack Form.

### Chart Components (`src/components/charts/`)
Data visualization components.

## Routing

The application uses TanStack Router with file-based routing. Routes are organized by feature:

- `/` - Dashboard
- `/inventory` - Product inventory
- `/inventory/add` - Add new product
- `/suppliers` - Supplier management
- `/reports` - Reports and analytics
- `/auth` - Authentication pages

## Type Safety

The project uses TypeScript for type safety. All data structures are defined in `src/types/`.

## Adding Components

Add shadcn/ui components using:

```bash
pnpm dlx shadcn@latest add button
```

Or add all components:

```bash
pnpm dlx shadcn@latest add --all
```

## Contributing

1. Follow the existing code structure and naming conventions
2. Use TypeScript for all new code
3. Add proper type definitions
4. Follow shadcn/ui component patterns
5. Test thoroughly before submitting

## License

This project is licensed under the MIT License.
