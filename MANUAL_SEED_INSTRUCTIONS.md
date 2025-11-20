# Manual Database Seed Instructions

This guide explains how to manually seed your PostgreSQL database with Phase 1 data for the Central Kitchen ERP system.

## Prerequisites

- PostgreSQL installed and running
- Database created (e.g., `central_kitchen_db`)
- Access to `psql` command-line tool or a PostgreSQL client (pgAdmin, DBeaver, etc.)

## What's Included

The seed script creates:
- **1 Tenant**: Central Kitchen Bakery & Cafe
- **3 Locations**: Central Kitchen + 2 Outlets (Senayan, BSD)
- **3 Users**: Admin, Manager, Barista
- **5 UoMs**: PCS, KG, L, ML, G
- **2 UoM Conversions**: KG↔G, L↔ML
- **3 Suppliers**: Coffee, Flour, Dairy suppliers
- **12 Products**:
  - 3 Raw Materials (Coffee Beans, Flour, Milk)
  - 9 Finished Goods (Espresso, Cappuccino, various bakery items)
- **3 Customers**: Walk-in + 2 registered customers

## Method 1: Using psql Command Line

```bash
# Connect to your database and run the seed script
psql -U postgres -d central_kitchen_db -f manual-seed-phase1.sql

# Or if using different credentials:
psql -U your_username -d your_database_name -f manual-seed-phase1.sql
```

## Method 2: Using pgAdmin

1. Open pgAdmin
2. Connect to your database
3. Open Query Tool (Tools → Query Tool)
4. Load the script:
   - Click the folder icon
   - Browse to `manual-seed-phase1.sql`
   - Click Execute (F5)

## Method 3: Using DBeaver or Other SQL Clients

1. Open your SQL client
2. Connect to the PostgreSQL database
3. Open the SQL script file
4. Execute the entire script

## Method 4: Copy-Paste

If you prefer, you can copy the contents of `manual-seed-phase1.sql` and paste directly into your PostgreSQL client.

## Important Notes

### ⚠️ Data Cleanup Warning
The script includes TRUNCATE statements that will **delete all existing data** in your tables. If you have existing data you want to keep, comment out the TRUNCATE section (lines 16-53) in the script.

### 🔐 Admin Credentials
After seeding, you can log in with:
- **Username**: `admin`
- **Email**: `admin@centralkitchen.com`
- **Password**: `admin123`

**Security Note**: Change the admin password immediately after first login in a production environment!

## Troubleshooting

### Error: "schema erp does not exist"
Make sure you've run the database migrations first:
```bash
cd apps/erp-api
pnpm db:migrate
```

### Error: "permission denied for schema erp"
Grant proper permissions to your user:
```sql
GRANT ALL PRIVILEGES ON SCHEMA erp TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp TO your_username;
```

### Error: "relation does not exist"
Ensure all tables have been created via Drizzle migrations before running the seed script.

## Verification

After running the seed script, verify the data was inserted:

```sql
-- Check tenant
SELECT * FROM erp.tenants;

-- Check locations
SELECT code, name, type FROM erp.locations;

-- Check products
SELECT sku, name, kind FROM erp.products;

-- Check users
SELECT email, role FROM erp.users;
```

## Next Steps

After seeding:
1. Start the API server: `cd apps/erp-api && pnpm dev`
2. Start the web app: `cd apps/erp && pnpm dev`
3. Log in at http://localhost:3000 with the admin credentials
4. Explore the system!

## Generating Additional Data

If you need more comprehensive test data, use the TypeScript seed script instead:
```bash
cd apps/erp-api
pnpm seed
```

This will generate more extensive data including:
- Purchase orders
- Stock ledger entries
- POS orders and payments
- Temperature logs
- Alerts and promotions
- And more...
