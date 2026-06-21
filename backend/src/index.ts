import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aourumSupabase, query, initDb } from './db.js';
import { hashPassword, verifyPassword } from './authUtils.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ── Auth Endpoints ────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, password, first_name, last_name } = req.body;
  if (!username || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Todos los campos (usuario, contraseña, nombre y apellido) son requeridos.' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres y la contraseña al menos 6.' });
  }

  try {
    // Check if user already exists
    const existing = await query('SELECT id FROM acon_users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
    }

    const hashed = hashPassword(password);
    await query(
      'INSERT INTO acon_users (username, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4)',
      [username, first_name.trim(), last_name.trim(), hashed]
    );

    return res.status(201).json({ status: 'success', username, first_name, last_name });
  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const result = await query('SELECT password_hash, first_name, last_name FROM acon_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const matched = verifyPassword(password, result.rows[0].password_hash);
    if (!matched) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    return res.json({
      status: 'success',
      username,
      first_name: result.rows[0].first_name,
      last_name: result.rows[0].last_name
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
});

// ── Status ────────────────────────────────────────────────────────
app.get('/api/status', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'neon connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'neon unreachable' });
  }
});

// ── Marcas de Aourum (catálogo externo, solo lectura) ─────────────
app.get('/api/brands', async (_req, res) => {
  try {
    const { data, error } = await aourumSupabase
      .from('brands')
      .select('id, name, logo, owner, category');

    if (error) throw error;
    return res.json(data);
  } catch (error: unknown) {
    console.error('Error fetching Aourum brands:', error);
    const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
    return res.status(500).json({ error: msg });
  }
});

// ── Productos de una marca de Aourum ─────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { brand_id } = req.query;
    if (!brand_id) {
      return res.status(400).json({ error: 'brand_id es requerido' });
    }

    const { data, error } = await aourumSupabase
      .from('products')
      .select('id, name, description, price, stock, image, category')
      .eq('brand_id', brand_id);

    if (error) throw error;
    return res.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error fetching Aourum products:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Vincular marca de Aourum localmente en Acon ───────────────────
app.post('/api/brands/link', async (req, res) => {
  const { aourum_brand_id, name } = req.body;
  if (!aourum_brand_id || !name) {
    return res.status(400).json({ error: 'aourum_brand_id y name son requeridos' });
  }

  try {
    // Check if brand is already registered
    const existing = await query(
      'SELECT * FROM acon_brands WHERE aourum_brand_id = $1',
      [aourum_brand_id]
    );

    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // Insert brand mapping
    const result = await query(
      'INSERT INTO acon_brands (aourum_brand_id, name) VALUES ($1, $2) RETURNING *',
      [aourum_brand_id, name]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error linking brand:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Ventas (Neon) ─────────────────────────────────────────────────
app.post('/api/sales', async (req, res) => {
  const { acon_brand_id, created_by, total, items } = req.body;

  if (!acon_brand_id || !total || !items?.length) {
    return res.status(400).json({ error: 'Faltan datos de la venta' });
  }

  try {
    const saleResult = await query(
      `INSERT INTO acon_sales (acon_brand_id, created_by, total, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [acon_brand_id, created_by, total]
    );

    const saleId = saleResult.rows[0].id;

    for (const item of items) {
      await query(
        `INSERT INTO acon_sale_items (sale_id, aourum_product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, item.aourum_product_id, item.product_name, item.unit_price, item.quantity]
      );
    }

    return res.status(201).json({ id: saleId, message: 'Venta registrada' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error saving sale:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Historial de Ventas por Marca (Neon) ──────────────────────────
app.get('/api/sales', async (req, res) => {
  const { acon_brand_id } = req.query;
  if (!acon_brand_id) {
    return res.status(400).json({ error: 'acon_brand_id es requerido' });
  }

  try {
    const result = await query(
      `SELECT s.id as sale_id, s.created_by, s.total, s.created_at,
              si.id as item_id, si.aourum_product_id, si.product_name, si.unit_price, si.quantity
       FROM acon_sales s
       LEFT JOIN acon_sale_items si ON s.id = si.sale_id
       WHERE s.acon_brand_id = $1
       ORDER BY s.created_at DESC`,
      [acon_brand_id]
    );

    const salesMap: Record<number, { id: number; created_by: string; total: number; created_at: string; items: any[] }> = {};

    for (const row of result.rows) {
      const saleId = row.sale_id;
      if (!salesMap[saleId]) {
        salesMap[saleId] = {
          id: saleId,
          created_by: row.created_by,
          total: Number(row.total),
          created_at: row.created_at,
          items: []
        };
      }

      if (row.item_id) {
        salesMap[saleId].items.push({
          id: row.item_id,
          aourum_product_id: row.aourum_product_id,
          product_name: row.product_name,
          unit_price: Number(row.unit_price),
          quantity: row.quantity
        });
      }
    }

    return res.json(Object.values(salesMap));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error fetching sales history:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Insumos internos: Listar (Neon) ───────────────────────────────
app.get('/api/internal-items', async (req, res) => {
  const { acon_brand_id } = req.query;
  if (!acon_brand_id) {
    return res.status(400).json({ error: 'acon_brand_id es requerido' });
  }

  try {
    const result = await query(
      `SELECT * FROM acon_internal_items WHERE acon_brand_id = $1 ORDER BY created_at DESC`,
      [acon_brand_id]
    );
    return res.json(result.rows);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error fetching internal items:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Insumos internos: Crear (Neon) ────────────────────────────────
app.post('/api/internal-items', async (req, res) => {
  const { acon_brand_id, name, category, stock } = req.body;
  if (!acon_brand_id || !name) {
    return res.status(400).json({ error: 'acon_brand_id y name son requeridos' });
  }

  try {
    const result = await query(
      `INSERT INTO acon_internal_items (acon_brand_id, name, category, stock, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [acon_brand_id, name, category || 'Otros', stock || 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error creating internal item:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Insumos internos: Actualizar Stock (Neon) ─────────────────────
app.patch('/api/internal-items/:id', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock === undefined) {
    return res.status(400).json({ error: 'stock es requerido' });
  }

  try {
    const result = await query(
      `UPDATE acon_internal_items
       SET stock = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [stock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error updating stock:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Insumos internos: Eliminar (Neon) ─────────────────────────────
app.delete('/api/internal-items/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `DELETE FROM acon_internal_items WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    return res.json({ message: 'Insumo eliminado', item: result.rows[0] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error deleting internal item:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Start ─────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Acon Backend corriendo en http://localhost:${PORT}`);
  });
});
