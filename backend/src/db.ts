import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ── Acon DB: Neon PostgreSQL (Lectura/Escritura) ─────────────────
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL no está definida. La conexión a Neon fallará.');
}

export const neonPool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Requerido por Neon
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Helper: ejecutar queries con el pool
export async function query(text: string, params?: unknown[]) {
  const client = await neonPool.connect();
  try {
    const res = await client.query(text, params as never[]);
    return res;
  } finally {
    client.release();
  }
}

// ── Aourum DB: Supabase (Solo Lectura) ───────────────────────────
const aourumUrl = process.env.AOURUM_SUPABASE_URL;
const aourumKey = process.env.AOURUM_SUPABASE_ANON_KEY;

if (!aourumUrl || !aourumKey) {
  console.warn('⚠️  AOURUM_SUPABASE_URL o AOURUM_SUPABASE_ANON_KEY no están definidas.');
}

export const aourumSupabase = createClient(aourumUrl || '', aourumKey || '');

// Inicializar tablas en Neon
export async function initDb() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS acon_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acon_brands (
        id SERIAL PRIMARY KEY,
        aourum_brand_id INTEGER UNIQUE,
        name VARCHAR(255) NOT NULL,
        owner_username VARCHAR(255) REFERENCES acon_users(username) ON DELETE CASCADE,
        sales_enabled BOOLEAN DEFAULT true,
        inventory_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acon_brand_collaborators (
        id SERIAL PRIMARY KEY,
        acon_brand_id INTEGER REFERENCES acon_brands(id) ON DELETE CASCADE,
        username VARCHAR(255) REFERENCES acon_users(username) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(acon_brand_id, username)
      );

      CREATE TABLE IF NOT EXISTS acon_products (
        id SERIAL PRIMARY KEY,
        acon_brand_id INTEGER REFERENCES acon_brands(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        stock INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(255) DEFAULT 'Otros',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acon_internal_items (
        id SERIAL PRIMARY KEY,
        acon_brand_id INTEGER REFERENCES acon_brands(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) DEFAULT 'Otros',
        stock INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acon_sections (
        id SERIAL PRIMARY KEY,
        acon_brand_id INTEGER REFERENCES acon_brands(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acon_section_products (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES acon_sections(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        UNIQUE(section_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS acon_sales (
        id SERIAL PRIMARY KEY,
        acon_brand_id INTEGER REFERENCES acon_brands(id) ON DELETE CASCADE,
        section_id INTEGER REFERENCES acon_sections(id) ON DELETE CASCADE,
        created_by VARCHAR(255) NOT NULL,
        total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS acon_sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES acon_sales(id) ON DELETE CASCADE,
        aourum_product_id INTEGER,
        product_name VARCHAR(255) NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        quantity INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS acon_aourum_product_stocks (
        id SERIAL PRIMARY KEY,
        acon_brand_id INTEGER REFERENCES acon_brands(id) ON DELETE CASCADE,
        aourum_product_id INTEGER NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        UNIQUE(acon_brand_id, aourum_product_id)
      );
    `);

    // Migraciones rápidas para bases de datos existentes
    await query(`
      ALTER TABLE acon_brands ADD COLUMN IF NOT EXISTS sales_enabled BOOLEAN DEFAULT true;
      ALTER TABLE acon_brands ADD COLUMN IF NOT EXISTS inventory_enabled BOOLEAN DEFAULT true;
    `);

    console.log('✅ Base de datos Acon inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error inicializando base de datos Acon:', error);
  }
}

