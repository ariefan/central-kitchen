import { db } from '../config/database.js';
import { sql, eq } from 'drizzle-orm';
import * as schema from '../config/schema.js';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';

const toNumericString = (value: number | bigint | string): string => {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

const addToNumericString = (
  base: number | string | null | undefined,
  delta: number
): string => {
  const baseNumber =
    base === null || base === undefined ? 0 : Number(base as string | number);
  return toNumericString(baseNumber + delta);
};

// Comprehensive seed data for F&B ERP system
async function seedDatabase() {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // Clear existing data in reverse dependency order
    console.log('🧹 Cleaning existing data...');
    await db.execute(sql`SET session_replication_role = replica;`);

    // Clear all working tables in dependency order
    const tables = [
      'stock_ledger',
      'order_items',
      'orders',
      'payments',
      'order_item_modifiers',
      'pos_shifts',
      'purchase_order_items',
      'purchase_orders',
      'supplier_products',
      'temperature_logs',
      'alerts',
      'promotions',
      'menu_items',
      'menus',
      'product_modifier_groups',
      'modifiers',
      'modifier_groups',
      'price_book_items',
      'price_books',
      'product_packs',
      'product_variants',
      'lots',
      'uom_conversions',
      'addresses',
      'customers',
      'suppliers',
      'products',
      'uoms',
      'users',
      'locations',
      'tenants',
      'doc_sequences',
      'tax_rates',
      'tax_categories'
    ];

    for (const table of tables) {
      await db.execute(sql`DELETE FROM erp.${sql.identifier(table)}`);
    }

    await db.execute(sql`SET session_replication_role = DEFAULT;`);

    // 1. Tenants
    console.log('📦 Creating tenants...');
    const [tenantDemo] = await db.insert(schema.tenants).values({
      orgId: faker.string.uuid(),
      name: faker.company.name() + ' Cafe & Bakery',
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      isActive: true,
      metadata: {
        settings: {
          timezone: 'Asia/Jakarta',
          currency: 'IDR',
          taxNumber: faker.string.alphanumeric(10).toUpperCase()
        }
      }
    }).returning();
    if (!tenantDemo) {
      throw new Error('Failed to create tenant demo tenant');
    }

    // 2. Tax Categories & Rates
    console.log('💰 Creating tax categories...');
    await db.insert(schema.taxCategories).values({
      tenantId: tenantDemo.id,
      code: 'FOOD',
      name: 'Food & Beverages'
    }).returning();

    await db.insert(schema.taxCategories).values({
      tenantId: tenantDemo.id,
      code: 'SERVICE',
      name: 'Service Charge'
    }).returning();

    await db.insert(schema.taxRates).values(
      {
        tenantId: tenantDemo.id,
        categoryCode: 'FOOD',
        ratePct: "11",
        inclusive: true,
        startAt: new Date('2024-01-01')
      }
    );

    await db.insert(schema.taxRates).values(
      {
        tenantId: tenantDemo.id,
        categoryCode: 'SERVICE',
        ratePct: "10",
        inclusive: true,
        startAt: new Date('2024-01-01')
      }
    );

    // 3. Document Sequences
    console.log('📋 Creating document sequences...');
    await db.insert(schema.docSequences).values([
      { tenantId: tenantDemo.id, docType: 'PO', period: '2025-01', nextNumber: 1 },
      { tenantId: tenantDemo.id, docType: 'ORDER', period: '2025-01', nextNumber: 1 }
    ]);

    // 4. Locations
    console.log('🏪 Creating locations...');
    const locations = await db.insert(schema.locations).values([
      {
        tenantId: tenantDemo.id,
        code: 'CK-001',
        name: 'Central Kitchen - ' + faker.location.city(),
        type: 'central_kitchen',
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        code: 'OUT-001',
        name: 'Demo Cafe - ' + faker.location.street(),
        type: 'outlet',
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        code: 'OUT-002',
        name: 'Demo Cafe - ' + faker.location.street(),
        type: 'outlet',
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        isActive: true
      }
    ]).returning();

    const [locationCentral, locationOutlet1, locationOutlet2] = locations;
    if (!locationCentral || !locationOutlet1 || !locationOutlet2) {
      throw new Error('Failed to seed locations');
    }

    // 5. Users
    console.log('👥 Creating users...');
    const users = await db.insert(schema.users).values([
      {
        authUserId: faker.string.uuid(),
        tenantId: tenantDemo.id,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'admin',
        locationId: locationCentral.id,
        isActive: true
      },
      {
        authUserId: faker.string.uuid(),
        tenantId: tenantDemo.id,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'manager',
        locationId: locationOutlet1.id,
        isActive: true
      },
      {
        authUserId: faker.string.uuid(),
        tenantId: tenantDemo.id,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: 'barista',
        locationId: locationOutlet1.id,
        isActive: true
      }
    ]).returning();

    const [userAdmin, , userBarista] = users;
    if (!userAdmin || !userBarista) {
      throw new Error('Failed to seed core users');
    }

    // 6. UoM & Conversions
    console.log('📏 Creating units of measure...');
    const uoms = await db.insert(schema.uoms).values([
      { code: 'PCS', name: 'Pieces', symbol: 'pc', kind: 'count' },
      { code: 'KG', name: 'Kilogram', symbol: 'kg', kind: 'weight' },
      { code: 'L', name: 'Liter', symbol: 'L', kind: 'volume' },
      { code: 'ML', name: 'Milliliter', symbol: 'ml', kind: 'volume' },
      { code: 'G', name: 'Gram', symbol: 'g', kind: 'weight' }
    ]).returning();

    const [uomPcs, uomKg, uomLiter, uomMl, uomGram] = uoms;
    if (!uomPcs || !uomKg || !uomLiter || !uomMl || !uomGram) {
      throw new Error('Failed to seed base units of measure');
    }

    await db.insert(schema.uomConversions).values([
      { fromUomId: uomKg.id, toUomId: uomGram.id, factor: "1000" },
      { fromUomId: uomLiter.id, toUomId: uomMl.id, factor: "1000" }
    ]);

    // 7. Suppliers
    console.log('🚚 Creating suppliers...');
    const suppliers = await db.insert(schema.suppliers).values([
      {
        tenantId: tenantDemo.id,
        code: 'SUP-001',
        name: faker.company.name() + ' Coffee Supplies',
        contactPerson: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        paymentTerms: faker.number.int({ min: 7, max: 60 }),
        creditLimit: toNumericString(faker.number.int({ min: 10000000, max: 100000000 })),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        code: 'SUP-002',
        name: faker.company.name() + ' Bakery Supplies',
        contactPerson: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        paymentTerms: faker.number.int({ min: 7, max: 30 }),
        creditLimit: toNumericString(faker.number.int({ min: 5000000, max: 50000000 })),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        code: 'SUP-003',
        name: faker.company.name() + ' Dairy Fresh',
        contactPerson: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        paymentTerms: faker.number.int({ min: 7, max: 21 }),
        creditLimit: toNumericString(faker.number.int({ min: 2000000, max: 30000000 })),
        isActive: true
      }
    ]).returning();

    const [supplierCoffee, supplierFlour, supplierMilk] = suppliers;
    if (!supplierCoffee || !supplierFlour || !supplierMilk) {
      throw new Error('Failed to seed suppliers');
    }

    // 8. Products
    console.log('☕ Creating products...');
    const products = await db.insert(schema.products).values([
      {
        tenantId: tenantDemo.id,
        sku: 'RM-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Premium Arabica Coffee Beans',
        description: faker.commerce.productDescription(),
        kind: 'raw_material',
        baseUomId: uomKg.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(120000),
        defaultPrice: toNumericString(150000),
        isPerishable: true,
        shelfLifeDays: 365,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'RM-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Bread Flour',
        description: faker.commerce.productDescription(),
        kind: 'raw_material',
        baseUomId: uomKg.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(15000),
        defaultPrice: toNumericString(18000),
        isPerishable: true,
        shelfLifeDays: 180,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'RM-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Fresh Milk',
        description: faker.commerce.productDescription(),
        kind: 'raw_material',
        baseUomId: uomLiter.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(14000),
        defaultPrice: toNumericString(16000),
        isPerishable: true,
        shelfLifeDays: 7,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Espresso',
        description: faker.commerce.productDescription(),
        kind: 'finished_good',
        baseUomId: uomMl.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(3000),
        defaultPrice: toNumericString(15000),
        isPerishable: false,
        shelfLifeDays: 0,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Cappuccino',
        description: faker.commerce.productDescription(),
        kind: 'finished_good',
        baseUomId: uomMl.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(4500),
        defaultPrice: toNumericString(25000),
        isPerishable: false,
        shelfLifeDays: 0,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Butter Croissant',
        description: faker.commerce.productDescription(),
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(8000),
        defaultPrice: toNumericString(20000),
        isPerishable: true,
        shelfLifeDays: 2,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Chocolate Cake Slice',
        description: faker.commerce.productDescription(),
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(15000),
        defaultPrice: toNumericString(35000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      // New bakery items
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Soft Sourdough Cranberry Keju',
        description: 'Soft sourdough bread with cranberry and cheese',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(12000),
        defaultPrice: toNumericString(28000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Soft Sourdough Cranberry Coklat',
        description: 'Soft sourdough bread with cranberry and chocolate',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(12000),
        defaultPrice: toNumericString(28000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Soft Sourdough Cranberry Blueberry Creamcheese',
        description: 'Soft sourdough bread with cranberry, blueberry and cream cheese',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(14000),
        defaultPrice: toNumericString(32000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Soft Sourdough Coklat Kacang',
        description: 'Soft sourdough bread with chocolate and peanuts',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(12000),
        defaultPrice: toNumericString(28000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Soft Cookies Coklat',
        description: 'Soft chocolate cookies',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(8000),
        defaultPrice: toNumericString(18000),
        isPerishable: true,
        shelfLifeDays: 5,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Soft Cookies Red Velvet',
        description: 'Soft red velvet cookies with cream cheese filling',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(10000),
        defaultPrice: toNumericString(22000),
        isPerishable: true,
        shelfLifeDays: 5,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Brownies Cookies',
        description: 'Fudgy brownie cookies',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(9000),
        defaultPrice: toNumericString(20000),
        isPerishable: true,
        shelfLifeDays: 5,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Muffin Coklat',
        description: 'Chocolate muffins',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(10000),
        defaultPrice: toNumericString(25000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Roti Cartepillar',
        description: 'Caterpillar shaped bread with chocolate filling',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(12000),
        defaultPrice: toNumericString(30000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Bolo Bun',
        description: 'Sweet Mexican bun with crunchy topping',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(8000),
        defaultPrice: toNumericString(20000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Garlic Bread',
        description: 'Garlic bread with herbs',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(10000),
        defaultPrice: toNumericString(25000),
        isPerishable: true,
        shelfLifeDays: 2,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Cinnamon Roll',
        description: 'Sweet cinnamon roll with glaze',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(12000),
        defaultPrice: toNumericString(28000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Choco Roll',
        description: 'Chocolate roll with creamy filling',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(10000),
        defaultPrice: toNumericString(25000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        sku: 'FG-' + faker.string.alphanumeric(6).toUpperCase(),
        name: 'Donut Mochi',
        description: 'Mochi donut with various flavors',
        kind: 'finished_good',
        baseUomId: uomPcs.id,
        taxCategory: 'FOOD',
        standardCost: toNumericString(8000),
        defaultPrice: toNumericString(20000),
        isPerishable: true,
        shelfLifeDays: 3,
        barcode: faker.string.numeric(13),
        isActive: true
      }
    ]).returning();

    const [
      productCoffeeBeans, productFlour, productMilk, productEspresso, productCappuccino, productCroissant, productCakeSlice,
      productSourdoughKeju, productSourdoughCoklat, productSourdoughBlueberry, productSourdoughKacang,
      productCookiesCoklat, productCookiesRedVelvet, productBrowniesCookies, productMuffinCoklat,
      productRotiCaterpillar, productBoloBun, productGarlicBread, productCinnamonRoll,
      productChocoRoll, productDonutMochi
    ] = products;
    if (
      !productCoffeeBeans ||
      !productFlour ||
      !productMilk ||
      !productEspresso ||
      !productCappuccino ||
      !productCroissant ||
      !productCakeSlice ||
      !productSourdoughKeju ||
      !productSourdoughCoklat ||
      !productSourdoughBlueberry ||
      !productSourdoughKacang ||
      !productCookiesCoklat ||
      !productCookiesRedVelvet ||
      !productBrowniesCookies ||
      !productMuffinCoklat ||
      !productRotiCaterpillar ||
      !productBoloBun ||
      !productGarlicBread ||
      !productCinnamonRoll ||
      !productChocoRoll ||
      !productDonutMochi
    ) {
      throw new Error('Failed to seed product catalog');
    }

    // 9. Product Variants
    console.log('🔄 Creating product variants...');
    await db.insert(schema.productVariants).values([
      {
        productId: productCappuccino.id,
        code: 'LARGE',
        name: 'Large',
        extraPrice: toNumericString(5000),
        isActive: true
      },
      {
        productId: productCappuccino.id,
        code: 'SMALL',
        name: 'Small',
        extraPrice: toNumericString(-3000),
        isActive: true
      }
    ]);

    // 10. Product Packs
    console.log('📦 Creating product packs...');
    await db.insert(schema.productPacks).values([
      {
        productId: productCoffeeBeans.id,
        uomId: uomGram.id,
        packName: '250g',
        toBaseFactor: toNumericString(0.25),
        isDefault: true
      },
      {
        productId: productCoffeeBeans.id,
        uomId: uomPcs.id,
        packName: '500g Pack',
        toBaseFactor: toNumericString(0.5),
        isDefault: false
      },
      {
        productId: productMilk.id,
        uomId: uomMl.id,
        packName: '250ml Carton',
        toBaseFactor: toNumericString(0.25),
        isDefault: true
      }
    ]);

    // 11. Supplier Products
    console.log('🔗 Creating supplier products...');
    await db.insert(schema.supplierProducts).values([
      {
        supplierId: supplierCoffee.id,
        productId: productCoffeeBeans.id,
        supplierSku: 'CB-' + faker.string.alphanumeric(6).toUpperCase(),
        uomId: uomKg.id,
        unitPrice: toNumericString(productCoffeeBeans.standardCost ?? '0'),
        minOrderQty: toNumericString(5),
        leadTimeDays: 7,
        isPrimary: true,
        isActive: true
      },
      {
        supplierId: supplierFlour.id,
        productId: productFlour.id,
        supplierSku: 'BF-' + faker.string.alphanumeric(6).toUpperCase(),
        uomId: uomKg.id,
        unitPrice: toNumericString(productFlour.standardCost ?? '0'),
        minOrderQty: toNumericString(25),
        leadTimeDays: 3,
        isPrimary: true,
        isActive: true
      },
      {
        supplierId: supplierMilk.id,
        productId: productMilk.id,
        supplierSku: 'FM-' + faker.string.alphanumeric(6).toUpperCase(),
        uomId: uomLiter.id,
        unitPrice: toNumericString(productMilk.standardCost ?? '0'),
        minOrderQty: toNumericString(10),
        leadTimeDays: 2,
        isPrimary: true,
        isActive: true
      }
    ]);

    // 12. Customers & Addresses
    console.log('👤 Creating customers...');
    const customers = await db.insert(schema.customers).values([
      {
        tenantId: tenantDemo.id,
        code: 'WALKIN',
        name: 'Walk-in Customer',
        type: 'walk_in',
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        authUserId: faker.string.uuid(),
        code: 'CUST-' + faker.string.alphanumeric(6).toUpperCase(),
        name: faker.person.fullName(),
        type: 'external',
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        paymentTerms: 0,
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        authUserId: faker.string.uuid(),
        code: 'CUST-' + faker.string.alphanumeric(6).toUpperCase(),
        name: faker.person.fullName(),
        type: 'external',
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        paymentTerms: 30,
        isActive: true
      }
    ]).returning();

    const [customerWalkIn, customerJohn, customerJane] = customers;
    if (!customerWalkIn || !customerJohn || !customerJane) {
      throw new Error('Failed to seed customers');
    }

    await db.insert(schema.addresses).values([
      {
        customerId: customerJohn.id,
        label: 'Home',
        line1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: faker.location.country(),
        isDefault: true
      },
      {
        customerId: customerJane.id,
        label: 'Office',
        line1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: faker.location.country(),
        isDefault: true
      }
    ]);

    // 13. Modifiers
    console.log('🥛 Creating modifier groups...');
    const modGroups = await db.insert(schema.modifierGroups).values([
      { tenantId: tenantDemo.id, name: 'Milk Options', minSelect: 0, maxSelect: 1 },
      { tenantId: tenantDemo.id, name: 'Sweetness Level', minSelect: 0, maxSelect: 1 },
      { tenantId: tenantDemo.id, name: 'Extra Add-ons', minSelect: 0, maxSelect: 3 }
    ]).returning();

    const [modGroupMilk, modGroupSweetness, modGroupExtras] = modGroups;
    if (!modGroupMilk || !modGroupSweetness || !modGroupExtras) {
      throw new Error('Failed to seed modifier groups');
    }

    await db.insert(schema.modifiers).values([
      // Milk Options
      { groupId: modGroupMilk.id, name: 'Whole Milk', priceDelta: toNumericString(0), sortOrder: 1, isActive: true },
      { groupId: modGroupMilk.id, name: 'Skim Milk', priceDelta: toNumericString(0), sortOrder: 2, isActive: true },
      { groupId: modGroupMilk.id, name: 'Oat Milk', priceDelta: toNumericString(5000), sortOrder: 3, isActive: true },
      { groupId: modGroupMilk.id, name: 'Almond Milk', priceDelta: toNumericString(5000), sortOrder: 4, isActive: true },

      // Sweetness
      { groupId: modGroupSweetness.id, name: 'No Sugar', priceDelta: toNumericString(0), sortOrder: 1, isActive: true },
      { groupId: modGroupSweetness.id, name: 'Less Sugar', priceDelta: toNumericString(0), sortOrder: 2, isActive: true },
      { groupId: modGroupSweetness.id, name: 'Regular Sugar', priceDelta: toNumericString(0), sortOrder: 3, isActive: true },
      { groupId: modGroupSweetness.id, name: 'Extra Sugar', priceDelta: toNumericString(1000), sortOrder: 4, isActive: true },

      // Extras
      { groupId: modGroupExtras.id, name: 'Extra Shot', priceDelta: toNumericString(8000), sortOrder: 1, isActive: true },
      { groupId: modGroupExtras.id, name: 'Vanilla Syrup', priceDelta: toNumericString(3000), sortOrder: 2, isActive: true },
      { groupId: modGroupExtras.id, name: 'Caramel Syrup', priceDelta: toNumericString(3000), sortOrder: 3, isActive: true },
      { groupId: modGroupExtras.id, name: 'Whipped Cream', priceDelta: toNumericString(4000), sortOrder: 4, isActive: true }
    ]);

    await db.insert(schema.productModifierGroups).values([
      { productId: productEspresso.id, groupId: modGroupMilk.id },
      { productId: productEspresso.id, groupId: modGroupSweetness.id },
      { productId: productEspresso.id, groupId: modGroupExtras.id },
      { productId: productCappuccino.id, groupId: modGroupMilk.id },
      { productId: productCappuccino.id, groupId: modGroupSweetness.id },
      { productId: productCappuccino.id, groupId: modGroupExtras.id }
    ]);

    // 14. Menus & Menu Items
    console.log('📋 Creating menus...');
    const menus = await db.insert(schema.menus).values([
      { tenantId: tenantDemo.id, name: 'Main POS Menu', channel: 'pos', isActive: true },
      { tenantId: tenantDemo.id, name: 'Online Delivery Menu', channel: 'online', isActive: true }
    ]).returning();

    const [menuPos, menuOnline] = menus;
    if (!menuPos || !menuOnline) {
      throw new Error('Failed to seed menus');
    }

    await db.insert(schema.menuItems).values([
      // POS Menu - Outlet 1 - Coffee & Drinks
      { menuId: menuPos.id, productId: productEspresso.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 1 },
      { menuId: menuPos.id, productId: productCappuccino.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 2 },

      // POS Menu - Outlet 1 - Bakery Items
      { menuId: menuPos.id, productId: productCroissant.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 3 },
      { menuId: menuPos.id, productId: productCakeSlice.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 4 },
      { menuId: menuPos.id, productId: productSourdoughKeju.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 5 },
      { menuId: menuPos.id, productId: productSourdoughCoklat.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 6 },
      { menuId: menuPos.id, productId: productSourdoughBlueberry.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 7 },
      { menuId: menuPos.id, productId: productSourdoughKacang.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 8 },
      { menuId: menuPos.id, productId: productCookiesCoklat.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 9 },
      { menuId: menuPos.id, productId: productCookiesRedVelvet.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 10 },
      { menuId: menuPos.id, productId: productBrowniesCookies.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 11 },
      { menuId: menuPos.id, productId: productMuffinCoklat.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 12 },
      { menuId: menuPos.id, productId: productRotiCaterpillar.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 13 },
      { menuId: menuPos.id, productId: productBoloBun.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 14 },
      { menuId: menuPos.id, productId: productGarlicBread.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 15 },
      { menuId: menuPos.id, productId: productCinnamonRoll.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 16 },
      { menuId: menuPos.id, productId: productChocoRoll.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 17 },
      { menuId: menuPos.id, productId: productDonutMochi.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 18 },

      // POS Menu - Outlet 2 - Coffee & Drinks
      { menuId: menuPos.id, productId: productEspresso.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 1 },
      { menuId: menuPos.id, productId: productCappuccino.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 2 },

      // POS Menu - Outlet 2 - Bakery Items
      { menuId: menuPos.id, productId: productCroissant.id, locationId: locationOutlet2.id, isAvailable: false, sortOrder: 3 },
      { menuId: menuPos.id, productId: productCakeSlice.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 4 },
      { menuId: menuPos.id, productId: productSourdoughKeju.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 5 },
      { menuId: menuPos.id, productId: productSourdoughCoklat.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 6 },
      { menuId: menuPos.id, productId: productSourdoughBlueberry.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 7 },
      { menuId: menuPos.id, productId: productSourdoughKacang.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 8 },
      { menuId: menuPos.id, productId: productCookiesCoklat.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 9 },
      { menuId: menuPos.id, productId: productCookiesRedVelvet.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 10 },
      { menuId: menuPos.id, productId: productBrowniesCookies.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 11 },
      { menuId: menuPos.id, productId: productMuffinCoklat.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 12 },
      { menuId: menuPos.id, productId: productRotiCaterpillar.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 13 },
      { menuId: menuPos.id, productId: productBoloBun.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 14 },
      { menuId: menuPos.id, productId: productGarlicBread.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 15 },
      { menuId: menuPos.id, productId: productCinnamonRoll.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 16 },
      { menuId: menuPos.id, productId: productChocoRoll.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 17 },
      { menuId: menuPos.id, productId: productDonutMochi.id, locationId: locationOutlet2.id, isAvailable: true, sortOrder: 18 },

      // Online Menu - Coffee & Drinks
      { menuId: menuOnline.id, productId: productEspresso.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 1 },
      { menuId: menuOnline.id, productId: productCappuccino.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 2 },

      // Online Menu - Bakery Items
      { menuId: menuOnline.id, productId: productCroissant.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 3 },
      { menuId: menuOnline.id, productId: productCakeSlice.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 4 },
      { menuId: menuOnline.id, productId: productSourdoughKeju.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 5 },
      { menuId: menuOnline.id, productId: productSourdoughCoklat.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 6 },
      { menuId: menuOnline.id, productId: productSourdoughBlueberry.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 7 },
      { menuId: menuOnline.id, productId: productSourdoughKacang.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 8 },
      { menuId: menuOnline.id, productId: productCookiesCoklat.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 9 },
      { menuId: menuOnline.id, productId: productCookiesRedVelvet.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 10 },
      { menuId: menuOnline.id, productId: productBrowniesCookies.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 11 },
      { menuId: menuOnline.id, productId: productMuffinCoklat.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 12 },
      { menuId: menuOnline.id, productId: productRotiCaterpillar.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 13 },
      { menuId: menuOnline.id, productId: productBoloBun.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 14 },
      { menuId: menuOnline.id, productId: productGarlicBread.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 15 },
      { menuId: menuOnline.id, productId: productCinnamonRoll.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 16 },
      { menuId: menuOnline.id, productId: productChocoRoll.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 17 },
      { menuId: menuOnline.id, productId: productDonutMochi.id, locationId: locationOutlet1.id, isAvailable: true, sortOrder: 18 }
    ]);

    // 15. Price Books
    console.log('💰 Creating price books...');
    const [priceBookStandard] = await db.insert(schema.priceBooks).values({
      tenantId: tenantDemo.id,
      name: 'Standard Pricing',
      isActive: true
    }).returning();
    if (!priceBookStandard) {
      throw new Error('Failed to seed price book');
    }

    await db.insert(schema.priceBookItems).values([
      // Outlet 1 Pricing - Coffee & Drinks
      { priceBookId: priceBookStandard.id, productId: productEspresso.id, locationId: locationOutlet1.id, price: toNumericString(productEspresso.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productCappuccino.id, locationId: locationOutlet1.id, price: toNumericString(productCappuccino.defaultPrice ?? '0') },

      // Outlet 1 Pricing - Bakery Items
      { priceBookId: priceBookStandard.id, productId: productCroissant.id, locationId: locationOutlet1.id, price: toNumericString(productCroissant.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productCakeSlice.id, locationId: locationOutlet1.id, price: toNumericString(productCakeSlice.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productSourdoughKeju.id, locationId: locationOutlet1.id, price: toNumericString(productSourdoughKeju.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productSourdoughCoklat.id, locationId: locationOutlet1.id, price: toNumericString(productSourdoughCoklat.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productSourdoughBlueberry.id, locationId: locationOutlet1.id, price: toNumericString(productSourdoughBlueberry.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productSourdoughKacang.id, locationId: locationOutlet1.id, price: toNumericString(productSourdoughKacang.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productCookiesCoklat.id, locationId: locationOutlet1.id, price: toNumericString(productCookiesCoklat.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productCookiesRedVelvet.id, locationId: locationOutlet1.id, price: toNumericString(productCookiesRedVelvet.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productBrowniesCookies.id, locationId: locationOutlet1.id, price: toNumericString(productBrowniesCookies.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productMuffinCoklat.id, locationId: locationOutlet1.id, price: toNumericString(productMuffinCoklat.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productRotiCaterpillar.id, locationId: locationOutlet1.id, price: toNumericString(productRotiCaterpillar.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productBoloBun.id, locationId: locationOutlet1.id, price: toNumericString(productBoloBun.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productGarlicBread.id, locationId: locationOutlet1.id, price: toNumericString(productGarlicBread.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productCinnamonRoll.id, locationId: locationOutlet1.id, price: toNumericString(productCinnamonRoll.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productChocoRoll.id, locationId: locationOutlet1.id, price: toNumericString(productChocoRoll.defaultPrice ?? '0') },
      { priceBookId: priceBookStandard.id, productId: productDonutMochi.id, locationId: locationOutlet1.id, price: toNumericString(productDonutMochi.defaultPrice ?? '0') },

      // Outlet 2 Pricing - Coffee & Drinks (slightly higher prices)
      { priceBookId: priceBookStandard.id, productId: productEspresso.id, locationId: locationOutlet2.id, price: addToNumericString(productEspresso.defaultPrice, 1000) },
      { priceBookId: priceBookStandard.id, productId: productCappuccino.id, locationId: locationOutlet2.id, price: addToNumericString(productCappuccino.defaultPrice, 1000) },

      // Outlet 2 Pricing - Bakery Items (slightly higher prices)
      { priceBookId: priceBookStandard.id, productId: productCakeSlice.id, locationId: locationOutlet2.id, price: addToNumericString(productCakeSlice.defaultPrice, 1000) },
      { priceBookId: priceBookStandard.id, productId: productSourdoughKeju.id, locationId: locationOutlet2.id, price: addToNumericString(productSourdoughKeju.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productSourdoughCoklat.id, locationId: locationOutlet2.id, price: addToNumericString(productSourdoughCoklat.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productSourdoughBlueberry.id, locationId: locationOutlet2.id, price: addToNumericString(productSourdoughBlueberry.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productSourdoughKacang.id, locationId: locationOutlet2.id, price: addToNumericString(productSourdoughKacang.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productCookiesCoklat.id, locationId: locationOutlet2.id, price: addToNumericString(productCookiesCoklat.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productCookiesRedVelvet.id, locationId: locationOutlet2.id, price: addToNumericString(productCookiesRedVelvet.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productBrowniesCookies.id, locationId: locationOutlet2.id, price: addToNumericString(productBrowniesCookies.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productMuffinCoklat.id, locationId: locationOutlet2.id, price: addToNumericString(productMuffinCoklat.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productRotiCaterpillar.id, locationId: locationOutlet2.id, price: addToNumericString(productRotiCaterpillar.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productBoloBun.id, locationId: locationOutlet2.id, price: addToNumericString(productBoloBun.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productGarlicBread.id, locationId: locationOutlet2.id, price: addToNumericString(productGarlicBread.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productCinnamonRoll.id, locationId: locationOutlet2.id, price: addToNumericString(productCinnamonRoll.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productChocoRoll.id, locationId: locationOutlet2.id, price: addToNumericString(productChocoRoll.defaultPrice, 2000) },
      { priceBookId: priceBookStandard.id, productId: productDonutMochi.id, locationId: locationOutlet2.id, price: addToNumericString(productDonutMochi.defaultPrice, 2000) }
    ]);

    // 16. Lots & Stock Ledger
    console.log('📦 Creating initial lots...');
    const lots = await db.insert(schema.lots).values([
      {
        tenantId: tenantDemo.id,
        productId: productCoffeeBeans.id,
        locationId: locationCentral.id,
        lotNo: 'CB-' + new Date().getFullYear() + '-001',
        expiryDate: faker.date.future({ years: 1 }),
        receivedDate: new Date(),
        notes: 'Fresh batch from Sumatra'
      },
      {
        tenantId: tenantDemo.id,
        productId: productFlour.id,
        locationId: locationCentral.id,
        lotNo: 'BF-' + new Date().getFullYear() + '-001',
        expiryDate: faker.date.future({ years: 0.5 }),
        receivedDate: new Date(),
        notes: 'Premium grade flour'
      }
    ]).returning();

    const [lotCoffee, lotFlour] = lots;
    if (!lotCoffee || !lotFlour) {
      throw new Error('Failed to seed inventory lots');
    }

    console.log('📊 Creating initial stock entries...');
    const initialStockRefs = Array.from({ length: 8 }, () => randomUUID());

    const stockEntries: Array<typeof schema.stockLedger.$inferInsert> = [
      // Central Kitchen initial inventory
      {
        tenantId: tenantDemo.id,
        productId: productCoffeeBeans.id,
        locationId: locationCentral.id,
        lotId: lotCoffee.id,
        type: 'rcv',
        qtyDeltaBase: toNumericString(50),
        unitCost: toNumericString(productCoffeeBeans.standardCost ?? '0'),
        refType: 'INIT',
        refId: initialStockRefs[0]!,
        createdBy: userAdmin.id
      },
      {
        tenantId: tenantDemo.id,
        productId: productFlour.id,
        locationId: locationCentral.id,
        lotId: lotFlour.id,
        type: 'rcv',
        qtyDeltaBase: toNumericString(100),
        unitCost: toNumericString(productFlour.standardCost ?? '0'),
        refType: 'INIT',
        refId: initialStockRefs[1]!,
        createdBy: userAdmin.id
      },
      {
        tenantId: tenantDemo.id,
        productId: productMilk.id,
        locationId: locationCentral.id,
        type: 'rcv',
        qtyDeltaBase: toNumericString(20),
        unitCost: toNumericString(productMilk.standardCost ?? '0'),
        refType: 'INIT',
        refId: initialStockRefs[2]!,
        createdBy: userAdmin.id
      },

      // Transfer some stock to outlets
      {
        tenantId: tenantDemo.id,
        productId: productCoffeeBeans.id,
        locationId: locationOutlet1.id,
        type: 'rcv',
        qtyDeltaBase: toNumericString(10),
        unitCost: toNumericString(productCoffeeBeans.standardCost ?? '0'),
        refType: 'INIT',
        refId: initialStockRefs[3]!,
        createdBy: userAdmin.id
      },
      {
        tenantId: tenantDemo.id,
        productId: productCoffeeBeans.id,
        locationId: locationOutlet2.id,
        type: 'rcv',
        qtyDeltaBase: toNumericString(8),
        unitCost: toNumericString(productCoffeeBeans.standardCost ?? '0'),
        refType: 'INIT',
        refId: initialStockRefs[4]!,
        createdBy: userAdmin.id
      }
    ];
    await db.insert(schema.stockLedger).values(stockEntries);

    // 17. Purchase Orders
    console.log('📋 Creating purchase orders...');
    const [purchaseOrder1] = await db.insert(schema.purchaseOrders).values({
      tenantId: tenantDemo.id,
      orderNumber: 'PO-' + new Date().getFullYear() + '-001',
      supplierId: supplierCoffee.id,
      locationId: locationCentral.id,
      status: 'confirmed',
      subtotal: toNumericString(1200000),
      taxAmount: toNumericString(132000),
      totalAmount: toNumericString(1332000),
      paymentTerms: 30,
      createdBy: userAdmin.id,
      approvedBy: userAdmin.id,
      approvedAt: new Date()
    }).returning();
    if (!purchaseOrder1) {
      throw new Error('Failed to seed purchase order');
    }

    await db.insert(schema.purchaseOrderItems).values([
      {
        purchaseOrderId: purchaseOrder1.id,
        productId: productCoffeeBeans.id,
        quantity: toNumericString(10),
        uomId: uomKg.id,
        unitPrice: toNumericString(productCoffeeBeans.standardCost ?? '0'),
        lineTotal: toNumericString(1200000)
      }
    ]);

    // 18. POS Shifts & Orders
    console.log('🕐 Creating POS shifts...');
    await db.insert(schema.posShifts).values({
      tenantId: tenantDemo.id,
      locationId: locationOutlet1.id,
      deviceId: 'POS-001',
      openedBy: userBarista.id,
      openedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      floatAmount: toNumericString(500000),
      expectedCash: toNumericString(1500000),
      actualCash: toNumericString(1485000),
      variance: toNumericString(-15000)
    }).returning();

    console.log('🛒 Creating orders...');
    const [order1] = await db.insert(schema.orders).values({
      tenantId: tenantDemo.id,
      orderNumber: 'ORDER-' + new Date().getFullYear() + '-001',
      locationId: locationOutlet1.id,
      customerId: customerJohn.id,
      deviceId: 'POS-001',
      channel: 'pos',
      type: 'dine_in',
      status: 'paid',
      kitchenStatus: 'served',
      tableNo: 'T05',
      subtotal: toNumericString(45000),
      taxAmount: toNumericString(4950),
      serviceChargeAmount: toNumericString(4500),
      tipsAmount: toNumericString(5000),
      totalAmount: toNumericString(59450),
      createdBy: userBarista.id
    }).returning();

    const [order2] = await db.insert(schema.orders).values({
      tenantId: tenantDemo.id,
      orderNumber: 'ORDER-' + new Date().getFullYear() + '-002',
      locationId: locationOutlet1.id,
      customerId: customerWalkIn.id,
      deviceId: 'POS-001',
      channel: 'pos',
      type: 'take_away',
      status: 'paid',
      kitchenStatus: 'ready',
      subtotal: toNumericString(25000),
      taxAmount: toNumericString(2750),
      totalAmount: toNumericString(27750),
      createdBy: userBarista.id
    }).returning();
    if (!order1 || !order2) {
      throw new Error('Failed to seed sample orders');
    }

    // Order Items
    const orderItems = await db.insert(schema.orderItems).values([
      {
        orderId: order1.id,
        productId: productCappuccino.id,
        quantity: toNumericString(1),
        unitPrice: toNumericString(productCappuccino.defaultPrice ?? '0'),
        taxAmount: toNumericString(2750),
        lineTotal: toNumericString(25000),
        prepStatus: 'served',
        station: 'coffee'
      },
      {
        orderId: order1.id,
        productId: productCroissant.id,
        quantity: toNumericString(1),
        unitPrice: toNumericString(productCroissant.defaultPrice ?? '0'),
        taxAmount: toNumericString(2200),
        lineTotal: toNumericString(20000),
        prepStatus: 'served',
        station: 'bakery'
      },
      {
        orderId: order2.id,
        productId: productEspresso.id,
        quantity: toNumericString(1),
        unitPrice: toNumericString(productEspresso.defaultPrice ?? '0'),
        taxAmount: toNumericString(1650),
        lineTotal: toNumericString(15000),
        prepStatus: 'ready',
        station: 'coffee'
      }
    ]).returning();
    const [order1CappuccinoItem, order1CroissantItem, order2EspressoItem] = orderItems;
    if (!order1CappuccinoItem || !order1CroissantItem || !order2EspressoItem) {
      throw new Error('Failed to seed order items');
    }

    // Order Item Modifiers
    const [oatMilkModifier] = await db
      .select({ id: schema.modifiers.id })
      .from(schema.modifiers)
      .where(eq(schema.modifiers.name, 'Oat Milk'))
      .limit(1);
    if (!oatMilkModifier) {
      throw new Error('Failed to fetch oat milk modifier');
    }
    await db.insert(schema.orderItemModifiers).values([
      {
        orderItemId: order1CappuccinoItem.id,
        modifierId: oatMilkModifier.id,
        priceDelta: toNumericString(5000)
      }
    ]);

    // Payments
    await db.insert(schema.payments).values([
      {
        orderId: order1.id,
        tender: 'cash',
        amount: toNumericString(55000),
        change: toNumericString(0),
        paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdBy: userBarista.id
      },
      {
        orderId: order1.id,
        tender: 'card',
        amount: toNumericString(4450),
        change: toNumericString(0),
        paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdBy: userBarista.id
      },
      {
        orderId: order2.id,
        tender: 'ewallet',
        amount: toNumericString(27750),
        reference: 'GOPAY-' + faker.string.numeric(5),
        change: toNumericString(0),
        paidAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdBy: userBarista.id
      }
    ]);

    // Temperature Logs & Alerts
    await db.insert(schema.temperatureLogs).values([
      {
        tenantId: tenantDemo.id,
        locationId: locationCentral.id,
        area: 'Storage Room A',
        temperature: toNumericString(18.5),
        humidity: toNumericString(65.2),
        recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        deviceId: 'TEMP-001',
        recordedBy: userAdmin.id
      },
      {
        tenantId: tenantDemo.id,
        locationId: locationCentral.id,
        area: 'Storage Room B',
        temperature: toNumericString(4.2),
        humidity: toNumericString(72.1),
        recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        deviceId: 'TEMP-002',
        recordedBy: userAdmin.id
      },
      {
        tenantId: tenantDemo.id,
        locationId: locationOutlet1.id,
        area: 'Display Fridge',
        temperature: toNumericString(3.8),
        humidity: toNumericString(68.5),
        recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        deviceId: 'TEMP-003',
        recordedBy: userBarista.id,
        isAlert: true,
        alertReason: 'Temperature slightly above optimal range'
      }
    ]);

    await db.insert(schema.alerts).values([
      {
        tenantId: tenantDemo.id,
        alertType: 'low_stock',
        priority: 'medium',
        title: 'Low Stock Alert',
        message: 'Coffee Beans running low at Outlet 2',
        productId: productCoffeeBeans.id,
        locationId: locationOutlet2.id,
        threshold: toNumericString(5),
        currentValue: toNumericString(8),
        isRead: false,
        isResolved: false
      },
      {
        tenantId: tenantDemo.id,
        alertType: 'expiry',
        priority: 'high',
        title: 'Expiry Alert',
        message: 'Flour batch expiring in 7 days',
        productId: productFlour.id,
        locationId: locationCentral.id,
        threshold: toNumericString(7),
        currentValue: toNumericString(7),
        isRead: false,
        isResolved: false
      }
    ]);

    // Promotions
    await db.insert(schema.promotions).values([
      {
        tenantId: tenantDemo.id,
        name: 'Morning Coffee Special',
        percentOff: toNumericString(15),
        productId: productEspresso.id,
        startAt: new Date(),
        endAt: faker.date.future({ years: 0.1 }),
        channel: 'pos',
        isActive: true
      },
      {
        tenantId: tenantDemo.id,
        name: 'Happy Hour',
        percentOff: toNumericString(10),
        startAt: new Date(),
        endAt: faker.date.future({ years: 0.1 }),
        channel: 'online',
        isActive: true
      }
    ]);

    console.log('✅ Comprehensive database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Tenant: ${tenantDemo.name}`);
    console.log(`- Locations: ${locations.length} (1 Central Kitchen, 2 Outlets)`);
    console.log(`- Products: ${products.length} (${products.filter(p => p.kind === 'raw_material').length} Raw Materials, ${products.filter(p => p.kind === 'finished_good').length} Finished Goods)`);
    console.log(`  • Coffee & Beverages: 2 products`);
    console.log(`  • Traditional Bakery: 4 products (croissant, cake slice, cinnamon roll, choco roll)`);
    console.log(`  • Sourdough Collection: 4 products (keju, coklat, blueberry creamcheese, kacang)`);
    console.log(`  • Cookies & Muffins: 3 products (chocolate cookies, red velvet, brownies)`);
    console.log(`  • Specialty Breads: 4 products (caterpillar, bolo bun, garlic bread, donut mochi)`);
    console.log(`- Suppliers: ${suppliers.length}`);
    console.log(`- Customers: ${customers.length}`);
    console.log(`- Orders: 2`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Purchase Orders: 1`);
    console.log(`- POS Shifts: 1`);
    console.log(`- Temperature Logs: 3`);
    console.log(`- Alerts: 2`);
    console.log(`- Promotions: 2`);
    console.log(`\n🎯 All 32 core tables have been seeded with realistic F&B data!`);
    console.log(`\n📈 This covers all essential F&B business flows:`);
    console.log(`   • Multi-tenant operations`);
    console.log(`   • Inventory management (central kitchen + outlets)`);
    console.log(`   • Complete POS operations (orders, payments, shifts)`);
    console.log(`   • Supply chain (suppliers, purchase orders)`);
    console.log(`   • Complete bakery product catalog with pricing`);
    console.log(`   • Multi-channel menu management (POS + Online)`);
    console.log(`   • Location-specific pricing strategy`);
    console.log(`   • Temperature monitoring and alerts`);
    console.log(`   • Promotion system`);
    console.log(`\n🍕 Added comprehensive bakery menu with 17 new items!`);
    console.log(`\n🎉 System is ready for testing!`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('🎉 Comprehensive seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });









