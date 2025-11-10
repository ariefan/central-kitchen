# ERP API

Enterprise Resource Planning API built with Fastify, TypeScript, PostgreSQL, Drizzle ORM, and Zod validation following clean architecture principles.

## ✨ Features

- **🚀 High Performance**: Built on Fastify with optimized request handling
- **🔒 Type Safety**: Full TypeScript coverage from database to API responses
- **📊 PostgreSQL Database**: Production-ready database with Drizzle ORM
- **✅ Validation**: Automatic request/response validation with Zod
- **📚 Documentation**: Auto-generated OpenAPI 3.0 docs with Swagger UI
- **🏗️ Clean Architecture**: Modular, scalable, and maintainable codebase
- **🔄 Hot Reload**: Development with tsx watch mode
- **🛡️ Error Handling**: Comprehensive error handling with proper HTTP status codes
- **🌿 Environment Config**: Secure environment variable management

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15+
- **ORM**: Drizzle ORM
- **Validation**: Zod + drizzle-zod
- **Package Manager**: pnpm
- **Documentation**: OpenAPI 3.0 with Swagger UI
- **Architecture**: Clean Architecture with modular design

## 📁 Project Structure

```
erp-api/
├── src/
│   ├── config/                 # Configuration files
│   │   ├── database.ts         # Database connection setup
│   │   ├── schema.ts           # Database schemas & Zod types
│   │   └── env.ts              # Environment variable validation
│   ├── modules/                # Business logic modules
│   │   ├── customers/          # Customer management
│   │   │   └── customer.routes.ts
│   │   ├── products/           # Product management
│   │   │   └── product.routes.ts
│   │   └── orders/             # Order management
│   │       └── order.routes.ts
│   ├── shared/                 # Shared utilities
│   │   ├── types/              # Common types
│   │   │   └── index.ts
│   │   └── utils/              # Utility functions
│   │       └── responses.ts    # API response helpers
│   ├── middleware/             # Fastify middleware
│   │   └── error-handler.ts    # Global error handler
│   ├── scripts/                # Database scripts
│   │   └── seed.ts             # Database seeding
│   └── index.ts                # Application entry point
├── drizzle/                    # Database migrations
├── .env.example                # Environment variables template
├── drizzle.config.ts           # Drizzle configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- pnpm 8+

### 1. Database Setup

Make sure you have PostgreSQL running and create the database:

```sql
-- Connect to PostgreSQL as postgres user
CREATE DATABASE "erp-api";
```

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd erp-api

# Install dependencies
pnpm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-api"
```

### 4. Database Setup

```bash
# Generate database migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# (Optional) Seed database with sample data
pnpm db:seed

# (Optional) Open Drizzle Studio for database management
pnpm db:studio
```

### 5. Development

```bash
# Start development server with hot reload
pnpm dev
```

The API will be available at `http://localhost:3000`
API documentation will be available at `http://localhost:3000/docs`

### 6. Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

### Endpoints

#### Health & Info
- `GET /health` - Health check with database status
- `GET /api` - API information and available endpoints

#### Customers
- `GET /api/customers` - List all customers (with pagination)
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

#### Products
- `GET /api/products` - List all products (with search, filters, and pagination)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

#### Orders
- `GET /api/orders` - List all orders (with filtering and pagination)
- `GET /api/orders/:id` - Get order by ID with full relations
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status

### Interactive Documentation
Visit `/docs` for interactive Swagger UI where you can test all endpoints.

## 🗄️ Database Schema

### Customers
```sql
- id (Serial, Primary Key)
- name (Varchar 255, Required)
- email (Varchar 255, Required, Unique)
- phone (Varchar 50, Optional)
- address (Text, Optional)
- created_at (Timestamp, Default: NOW())
- updated_at (Timestamp, Default: NOW())
```

### Products
```sql
- id (Serial, Primary Key)
- name (Varchar 255, Required)
- description (Text, Optional)
- price (Decimal 10,2, Required)
- stock (Integer, Required, Default: 0)
- sku (Varchar 100, Required, Unique)
- created_at (Timestamp, Default: NOW())
- updated_at (Timestamp, Default: NOW())
```

### Orders
```sql
- id (Serial, Primary Key)
- customer_id (Integer, Foreign Key → customers.id)
- total_amount (Decimal 10,2, Required)
- status (Enum: pending, processing, shipped, delivered, cancelled)
- order_date (Timestamp, Default: NOW())
- created_at (Timestamp, Default: NOW())
- updated_at (Timestamp, Default: NOW())
```

### Order Items
```sql
- id (Serial, Primary Key)
- order_id (Integer, Foreign Key → orders.id, On Delete: CASCADE)
- product_id (Integer, Foreign Key → products.id)
- quantity (Integer, Required)
- unit_price (Decimal 10,2, Required)
- created_at (Timestamp, Default: NOW())
```

## 🎯 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* Response data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": { /* Additional error details (development only) */ }
}
```

## 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start development server with hot reload
pnpm typecheck        # Run TypeScript type checking

# Database
pnpm db:generate      # Generate database migrations
pnpm db:migrate       # Run database migrations
pnpm db:push          # Push schema to database
pnpm db:drop          # Drop database tables
pnpm db:studio        # Open Drizzle Studio
pnpm db:seed          # Seed database with sample data

# Production
pnpm build            # Build TypeScript to JavaScript
pnpm start            # Start production server

# Code Quality (placeholders for future setup)
pnpm lint             # Run linter
pnpm test             # Run tests
```

## 💡 Example Usage

### Create a Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St, City, State"
  }'
```

### Create a Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Pro",
    "description": "High-performance laptop",
    "price": 1299.99,
    "stock": 50,
    "sku": "LP-PRO-001"
  }'
```

### Create an Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "items": [
      {
        "productId": 1,
        "quantity": 1,
        "unitPrice": 1299.99
      }
    ]
  }'
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp-api"

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# JWT (future implementation)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
```

## 🏗️ Architecture Principles

This project follows Clean Architecture principles:

- **Separation of Concerns**: Clear separation between business logic, data access, and API layers
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each module has a single reason to change
- **Open/Closed Principle**: Open for extension, closed for modification
- **Modular Design**: Features are organized into independent modules

## 🚀 Production Deployment

### Docker (Recommended)
```dockerfile
# Add Dockerfile example here
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set up proper logging levels
4. Configure reverse proxy (nginx/caddy)
5. Set up SSL certificates
6. Configure monitoring and alerting

## 📝 Development Notes

- All database queries are type-safe with Drizzle ORM
- API schemas are validated using Zod
- Error handling includes proper HTTP status codes
- Database migrations are version-controlled
- Environment variables are validated on startup
- Follow the existing code style and patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run type checking and tests
6. Submit a pull request

## 📄 License

ISC License