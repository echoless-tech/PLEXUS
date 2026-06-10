const mysql = require('mysql2/promise');

let pool = null;
let adminPool = null;

// Pool WITHOUT database — for initial CREATE DATABASE
function getAdminPool() {
  if (!adminPool) {
    adminPool = mysql.createPool({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT || '3306'),
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0,
      ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return adminPool;
}

// Pool WITH database — for normal queries
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT || '3306'),
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE || 'nodal',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function query(sql, params = []) {
  const db = getPool();
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function initDatabase() {
  // First: create database using admin pool (no database selected)
  const admin = getAdminPool();
  const dbName = process.env.RDS_DATABASE || 'nodal';
  try {
    await admin.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' ready`);
  } catch (err) {
    // If user lacks CREATE DATABASE privileges, it probably already exists
    console.log(`ℹ️  CREATE DATABASE skipped (${err.message}) — assuming '${dbName}' exists`);
  }
  // Close admin pool
  await admin.end();
  adminPool = null;

  // Now use the main pool (with database selected) to create tables
  const db = getPool();
  const conn = await db.getConnection();

  try {

    // Business Profile
    await conn.query(`
      CREATE TABLE IF NOT EXISTS business_profile (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        tagline VARCHAR(500),
        description TEXT,
        logo VARCHAR(500),
        cover_image VARCHAR(500),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        whatsapp VARCHAR(50),
        instagram VARCHAR(100),
        facebook VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Products
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        sku VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        quantity INT DEFAULT 0,
        reorder_level INT DEFAULT 10,
        price DECIMAL(12,2) NOT NULL,
        cost_price DECIMAL(12,2) NOT NULL,
        unit VARCHAR(50) DEFAULT 'piece',
        image_url VARCHAR(500),
        supplier_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Suppliers
    await conn.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        products_supplied JSON,
        last_order_date TIMESTAMP NULL,
        rating DECIMAL(3,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Sales
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id VARCHAR(36),
        customer_name VARCHAR(255),
        subtotal DECIMAL(12,2) NOT NULL,
        tax DECIMAL(12,2) DEFAULT 0,
        total DECIMAL(12,2) NOT NULL,
        payment_method ENUM('cash','card','mobile','credit') DEFAULT 'cash',
        status ENUM('paid','pending','overdue') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP NULL
      )
    `);

    // Sale Items
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        sale_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
    `);

    // Cash Flow
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cash_flow (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type ENUM('income','expense') NOT NULL,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(12,2) NOT NULL,
        reference VARCHAR(255)
      )
    `);

    // Stock Movements
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        product_id VARCHAR(36) NOT NULL,
        type ENUM('in','out','adjustment') NOT NULL,
        quantity INT NOT NULL,
        reason TEXT,
        reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
  } finally {
    conn.release();
  }
}

async function seedIfEmpty() {
  const db = getPool();
  const [rows] = await db.execute('SELECT COUNT(*) as count FROM products');
  if (rows[0].count > 0) {
    console.log('📦 Database already has data, skipping seed');
    return;
  }

  console.log('🌱 Seeding database with initial data...');

  // Seed business profile
  await db.execute(
    `INSERT INTO business_profile (id, name, tagline, description, phone, email, address, whatsapp, instagram, facebook)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'bp-001',
      'Apex General Store',
      'Your One-Stop Shop for Quality Products',
      'We are a trusted neighborhood store offering a wide range of quality products including electronics, groceries, personal care items, and household essentials. Serving our community with pride since 2020.',
      '+234 800 123 4567',
      'contact@apexstore.ng',
      '15 Commerce Avenue, Victoria Island, Lagos, Nigeria',
      '+234 801 234 5678',
      '@apexgeneralstore',
      'ApexGeneralStoreLagos',
    ]
  );

  // Seed products
  const products = [
    ['prod-001', 'ELEC-001', 'USB-C Charging Cable', 'Fast charging USB-C cable, 1.5m', 'Electronics', 45, 20, 850, 400, 'piece'],
    ['prod-002', 'ELEC-002', 'Wireless Earbuds', 'Bluetooth 5.0 wireless earbuds with case', 'Electronics', 12, 15, 4500, 2200, 'piece'],
    ['prod-003', 'GROC-001', 'Premium Rice (5kg)', 'Long grain premium rice', 'Groceries', 85, 30, 3200, 2400, 'bag'],
    ['prod-004', 'GROC-002', 'Cooking Oil (2L)', 'Refined vegetable cooking oil', 'Groceries', 8, 25, 1800, 1350, 'bottle'],
    ['prod-005', 'BEV-001', 'Bottled Water (500ml)', 'Pure drinking water pack of 12', 'Beverages', 120, 50, 1200, 800, 'pack'],
    ['prod-006', 'BEV-002', 'Soft Drink Assorted (330ml)', 'Mixed flavors carbonated drinks, pack of 6', 'Beverages', 65, 40, 1500, 1000, 'pack'],
    ['prod-007', 'CARE-001', 'Hand Sanitizer (250ml)', 'Antibacterial hand sanitizer gel', 'Personal Care', 35, 20, 650, 380, 'bottle'],
    ['prod-008', 'CARE-002', 'Facial Tissue Box', 'Soft facial tissue, 200 sheets', 'Personal Care', 0, 30, 450, 280, 'box'],
    ['prod-009', 'HOUSE-001', 'Laundry Detergent (1kg)', 'Concentrated powder detergent', 'Household', 42, 25, 1100, 720, 'pack'],
    ['prod-010', 'HOUSE-002', 'Dish Soap (500ml)', 'Concentrated dish washing liquid', 'Household', 18, 20, 380, 220, 'bottle'],
    ['prod-011', 'STAT-001', 'Notebook A5 (Pack of 5)', 'Ruled notebooks, 80 pages each', 'Stationery', 55, 30, 950, 580, 'pack'],
    ['prod-012', 'STAT-002', 'Ballpoint Pens (Box of 20)', 'Blue ink ballpoint pens', 'Stationery', 28, 15, 600, 350, 'box'],
    ['prod-013', 'ELEC-003', 'Phone Screen Protector', 'Tempered glass universal fit', 'Electronics', 75, 30, 450, 180, 'piece'],
    ['prod-014', 'GROC-003', 'Instant Noodles (Box of 40)', 'Assorted flavors instant noodles', 'Groceries', 22, 15, 4800, 3600, 'box'],
    ['prod-015', 'BEV-003', 'Energy Drink (250ml)', 'Caffeinated energy drink, pack of 6', 'Beverages', 38, 25, 2100, 1500, 'pack'],
  ];

  for (const p of products) {
    await db.execute(
      `INSERT INTO products (id, sku, name, description, category, quantity, reorder_level, price, cost_price, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p
    );
  }

  // Seed suppliers
  const suppliers = [
    ['sup-001', 'TechHub Distributors', 'Michael Chen', 'orders@techhub.com', '+234 801 234 5678', '45 Technology Drive, Lagos', '["Electronics"]', 4.8],
    ['sup-002', 'FreshGoods Wholesale', 'Sarah Adebayo', 'supply@freshgoods.ng', '+234 802 345 6789', '12 Market Street, Ibadan', '["Groceries","Beverages"]', 4.5],
    ['sup-003', 'CleanCare Supplies', 'Ahmed Hassan', 'sales@cleancare.co', '+234 803 456 7890', '78 Industrial Avenue, Kano', '["Personal Care","Household"]', 4.2],
    ['sup-004', 'PaperWorld Ltd', 'Chioma Eze', 'orders@paperworld.com', '+234 804 567 8901', '23 Commerce Road, Port Harcourt', '["Stationery"]', 4.6],
    ['sup-005', 'BeveragePro Nigeria', 'Tunde Bakare', 'wholesale@beveragepro.ng', '+234 805 678 9012', '56 Distribution Lane, Abuja', '["Beverages"]', 4.7],
  ];

  for (const s of suppliers) {
    await db.execute(
      `INSERT INTO suppliers (id, name, contact_person, email, phone, address, products_supplied, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      s
    );
  }

  console.log('✅ Database seeded with initial data');
}

module.exports = { getPool, query, initDatabase, seedIfEmpty };
