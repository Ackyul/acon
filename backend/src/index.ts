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
  const normalizedUsername = username.trim().toLowerCase();
  if (normalizedUsername.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres y la contraseña al menos 6.' });
  }

  try {
    // Check if user already exists (case-insensitive)
    const existing = await query('SELECT id FROM acon_users WHERE username = $1', [normalizedUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
    }

    const hashed = hashPassword(password);
    await query(
      'INSERT INTO acon_users (username, first_name, last_name, password_hash) VALUES ($1, $2, $3, $4)',
      [normalizedUsername, first_name.trim(), last_name.trim(), hashed]
    );

    return res.status(201).json({ status: 'success', username: normalizedUsername, first_name, last_name });
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

  const normalizedUsername = username.trim().toLowerCase();

  try {
    const result = await query('SELECT password_hash, first_name, last_name FROM acon_users WHERE username = $1', [normalizedUsername]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const matched = verifyPassword(password, result.rows[0].password_hash);
    if (!matched) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    return res.json({
      status: 'success',
      username: normalizedUsername,
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
// ── Marcas de Aourum (filtrando marcas ya vinculadas) ─────────────
app.get('/api/brands', async (_req, res) => {
  try {
    // 1. Obtener todas las marcas de Aourum
    const { data: aourumBrands, error } = await aourumSupabase
      .from('brands')
      .select('id, name, logo, owner, category');

    if (error) throw error;

    // 2. Obtener marcas de Aourum ya vinculadas en Neon
    const linked = await query('SELECT aourum_brand_id FROM acon_brands WHERE aourum_brand_id IS NOT NULL');
    const linkedIds = new Set(linked.rows.map(row => Number(row.aourum_brand_id)));

    // 3. Filtrar para no mostrar las ya vinculadas por otros usuarios
    const availableBrands = (aourumBrands || []).filter(b => !linkedIds.has(Number(b.id)));

    return res.json(availableBrands);
  } catch (error: unknown) {
    console.error('Error fetching Aourum brands:', error);
    const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
    return res.status(500).json({ error: msg });
  }
});

// ── Marcas del usuario (Propias y colaboraciones) ─────────────────
app.get('/api/brands/my', async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username es requerido' });
  }

  try {
    // Obtener las marcas de Neon (locales y de Aourum) propias o donde es colaborador
    const result = await query(
      `SELECT DISTINCT b.id, b.aourum_brand_id, b.name, b.owner_username, b.sales_enabled, b.inventory_enabled,
             (CASE WHEN b.owner_username = $1 THEN 'owner' ELSE 'collaborator' END) as user_role
       FROM acon_brands b
       LEFT JOIN acon_brand_collaborators c ON b.id = c.acon_brand_id
       WHERE b.owner_username = $1 OR c.username = $1
       ORDER BY b.id DESC`,
      [username]
    );

    // Para las marcas vinculadas de Aourum, queremos adjuntar los metadatos (logo, category, owner)
    const brands = [];
    const aconBrands = result.rows;

    // Obtener todas las de Aourum para cruzar datos
    const { data: aourumBrands } = await aourumSupabase
      .from('brands')
      .select('id, name, logo, owner, category');

    for (const aconBrand of aconBrands) {
      if (aconBrand.aourum_brand_id !== null) {
        const matchingAourum = aourumBrands?.find(b => Number(b.id) === Number(aconBrand.aourum_brand_id));
        brands.push({
          id: aconBrand.id,
          aourum_brand_id: aconBrand.aourum_brand_id,
          name: aconBrand.name,
          logo: matchingAourum?.logo,
          owner: matchingAourum?.owner,
          category: matchingAourum?.category,
          owner_username: aconBrand.owner_username,
          type: 'aourum',
          role: aconBrand.user_role,
          sales_enabled: aconBrand.sales_enabled,
          inventory_enabled: aconBrand.inventory_enabled
        });
      } else {
        brands.push({
          id: aconBrand.id,
          aourum_brand_id: null,
          name: aconBrand.name,
          owner_username: aconBrand.owner_username,
          type: 'local',
          role: aconBrand.user_role,
          sales_enabled: aconBrand.sales_enabled,
          inventory_enabled: aconBrand.inventory_enabled
        });
      }
    }

    return res.json(brands);
  } catch (error) {
    console.error('Error in get my brands:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Crear marca local
app.post('/api/brands/create-local', async (req, res) => {
  const { name, owner_username, sales_enabled, inventory_enabled } = req.body;
  if (!name || !owner_username) {
    return res.status(400).json({ error: 'name y owner_username son requeridos' });
  }

  try {
    const salesVal = sales_enabled !== undefined ? sales_enabled : true;
    const inventoryVal = inventory_enabled !== undefined ? inventory_enabled : true;

    const result = await query(
      'INSERT INTO acon_brands (name, owner_username, sales_enabled, inventory_enabled) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), owner_username, salesVal, inventoryVal]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating local brand:', error);
    return res.status(500).json({ error: 'Error interno al crear marca local.' });
  }
});

// Vincular marca de Aourum (Asignar)
app.post('/api/brands/link-aourum', async (req, res) => {
  const { aourum_brand_id, name, owner_username, sales_enabled, inventory_enabled } = req.body;
  if (!aourum_brand_id || !name || !owner_username) {
    return res.status(400).json({ error: 'aourum_brand_id, name y owner_username son requeridos' });
  }

  try {
    // Verificar si la marca de Aourum ya fue vinculada por alguien
    const existing = await query(
      'SELECT id FROM acon_brands WHERE aourum_brand_id = $1',
      [aourum_brand_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Esta marca de Aourum ya ha sido vinculada por otro usuario.' });
    }

    const salesVal = sales_enabled !== undefined ? sales_enabled : true;
    const inventoryVal = inventory_enabled !== undefined ? inventory_enabled : true;

    const result = await query(
      'INSERT INTO acon_brands (aourum_brand_id, name, owner_username, sales_enabled, inventory_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [aourum_brand_id, name.trim(), owner_username, salesVal, inventoryVal]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error linking Aourum brand:', error);
    return res.status(500).json({ error: 'Error interno al vincular marca.' });
  }
});

// ── Obtener productos de una marca vinculada o local ──────────────
app.get('/api/brands/:id/products', async (req, res) => {
  const { id } = req.params;

  try {
    const brandRes = await query('SELECT aourum_brand_id FROM acon_brands WHERE id = $1', [id]);
    if (brandRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }

    const brand = brandRes.rows[0];

    if (brand.aourum_brand_id !== null) {
      // Caso Aourum: Obtener de Supabase
      const { data, error } = await aourumSupabase
        .from('products')
        .select('id, name, description, price, stock, image, category')
        .eq('brand_id', brand.aourum_brand_id);

      if (error) throw error;

      // Combinar con stocks locales de Acon
      const stocksRes = await query(
        'SELECT aourum_product_id, stock FROM acon_aourum_product_stocks WHERE acon_brand_id = $1',
        [id]
      );
      const stocksMap = new Map(stocksRes.rows.map(r => [Number(r.aourum_product_id), Number(r.stock)]));

      const productsWithLocalStock = (data || []).map(p => ({
        ...p,
        stock: stocksMap.has(Number(p.id)) ? stocksMap.get(Number(p.id)) : 0
      }));

      return res.json(productsWithLocalStock);
    } else {
      // Caso Local: Obtener de Neon acon_products
      const productsRes = await query('SELECT * FROM acon_products WHERE acon_brand_id = $1 ORDER BY created_at DESC', [id]);
      return res.json(productsRes.rows);
    }
  } catch (error) {
    console.error('Error getting brand products:', error);
    return res.status(500).json({ error: 'Error interno al obtener productos.' });
  }
});

// ── Agregar producto a una marca local ──────────────────────────
app.post('/api/brands/:id/products', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name y price son requeridos' });
  }

  try {
    const brandRes = await query('SELECT aourum_brand_id FROM acon_brands WHERE id = $1', [id]);
    if (brandRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }

    if (brandRes.rows[0].aourum_brand_id !== null) {
      return res.status(400).json({ error: 'No se pueden agregar productos a una marca externa de Aourum.' });
    }

    const result = await query(
      `INSERT INTO acon_products (acon_brand_id, name, description, price, stock, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name.trim(), description || '', price, stock || 0, category || 'Otros']
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding local product:', error);
    return res.status(500).json({ error: 'Error interno al agregar producto.' });
  }
});

// Actualizar stock de un producto (Local o Aourum)
app.patch('/api/brands/:brandId/products/:productId/stock', async (req, res) => {
  const { brandId, productId } = req.params;
  const { stock } = req.body;

  if (stock === undefined) {
    return res.status(400).json({ error: 'stock es requerido.' });
  }

  const newStock = Math.max(0, Number(stock));

  try {
    const brandRes = await query('SELECT aourum_brand_id FROM acon_brands WHERE id = $1', [brandId]);
    if (brandRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }

    const brand = brandRes.rows[0];

    if (brand.aourum_brand_id !== null) {
      // Caso Aourum: Upsert en acon_aourum_product_stocks
      const result = await query(
        `INSERT INTO acon_aourum_product_stocks (acon_brand_id, aourum_product_id, stock)
         VALUES ($1, $2, $3)
         ON CONFLICT (acon_brand_id, aourum_product_id)
         DO UPDATE SET stock = EXCLUDED.stock
         RETURNING *`,
        [Number(brandId), Number(productId), newStock]
      );
      return res.json({ success: true, stock: result.rows[0].stock });
    } else {
      // Caso Local: Actualizar en acon_products
      const result = await query(
        `UPDATE acon_products
         SET stock = $1
         WHERE id = $2 AND acon_brand_id = $3
         RETURNING *`,
        [newStock, Number(productId), Number(brandId)]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }
      return res.json({ success: true, stock: result.rows[0].stock });
    }
  } catch (error) {
    console.error('Error updating product stock:', error);
    return res.status(500).json({ error: 'Error al actualizar el stock del producto.' });
  }
});

// Obtener detalle de marca por ID
app.get('/api/brands/detail/:id', async (req, res) => {
  const { id } = req.params;
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username es requerido.' });
  }

  try {
    // Verificar si es propietario o colaborador
    const checkRole = await query(
      `SELECT b.id, b.owner_username,
              (CASE WHEN b.owner_username = $2 THEN 'owner' ELSE 'collaborator' END) as user_role
       FROM acon_brands b
       LEFT JOIN acon_brand_collaborators c ON b.id = c.acon_brand_id
       WHERE b.id = $1 AND (b.owner_username = $2 OR c.username = $2)`,
      [id, username]
    );

    if (checkRole.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta marca.' });
    }

    const role = checkRole.rows[0].user_role;
    const brandRes = await query('SELECT id, aourum_brand_id, name, owner_username, sales_enabled, inventory_enabled FROM acon_brands WHERE id = $1', [id]);
    const brand = brandRes.rows[0];

    if (brand.aourum_brand_id !== null) {
      const { data: aourumBrand } = await aourumSupabase
        .from('brands')
        .select('id, name, logo, owner, category')
        .eq('id', brand.aourum_brand_id)
        .single();

      return res.json({
        id: brand.id,
        aourum_brand_id: brand.aourum_brand_id,
        name: brand.name,
        logo: aourumBrand?.logo,
        owner: aourumBrand?.owner,
        category: aourumBrand?.category,
        owner_username: brand.owner_username,
        type: 'aourum',
        role,
        sales_enabled: brand.sales_enabled,
        inventory_enabled: brand.inventory_enabled
      });
    } else {
      return res.json({
        id: brand.id,
        aourum_brand_id: null,
        name: brand.name,
        owner_username: brand.owner_username,
        type: 'local',
        role,
        sales_enabled: brand.sales_enabled,
        inventory_enabled: brand.inventory_enabled
      });
    }
  } catch (error) {
    console.error('Error fetching brand detail:', error);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

// Eliminar marca (Owner only)
app.delete('/api/brands/:id', async (req, res) => {
  const { id } = req.params;
  const { owner_username } = req.query;

  if (!owner_username) {
    return res.status(400).json({ error: 'owner_username es requerido' });
  }

  try {
    // 1. Verificar que el solicitante sea el propietario
    const ownerRes = await query('SELECT owner_username FROM acon_brands WHERE id = $1', [id]);
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }
    if (ownerRes.rows[0].owner_username !== owner_username) {
      return res.status(403).json({ error: 'Solo el propietario de la marca puede eliminarla.' });
    }

    // 2. Eliminar de la base de datos (con ON DELETE CASCADE)
    await query('DELETE FROM acon_brands WHERE id = $1', [id]);
    return res.json({ message: 'Marca eliminada con éxito.' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return res.status(500).json({ error: 'Error al eliminar la marca.' });
  }
});

// Actualizar características/módulos de una marca (Owner only)
app.patch('/api/brands/:id/features', async (req, res) => {
  const { id } = req.params;
  const { owner_username, sales_enabled, inventory_enabled } = req.body;

  if (!owner_username) {
    return res.status(400).json({ error: 'owner_username es requerido' });
  }

  if (sales_enabled === undefined || inventory_enabled === undefined) {
    return res.status(400).json({ error: 'sales_enabled e inventory_enabled son requeridos' });
  }

  if (!sales_enabled && !inventory_enabled) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un módulo (Ventas o Almacén).' });
  }

  try {
    // 1. Verificar que el solicitante sea el propietario
    const ownerRes = await query('SELECT owner_username FROM acon_brands WHERE id = $1', [id]);
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }
    if (ownerRes.rows[0].owner_username !== owner_username) {
      return res.status(403).json({ error: 'Solo el propietario de la marca puede configurar sus características.' });
    }

    // 2. Actualizar la marca
    const result = await query(
      'UPDATE acon_brands SET sales_enabled = $1, inventory_enabled = $2 WHERE id = $3 RETURNING *',
      [sales_enabled, inventory_enabled, id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating brand features:', error);
    return res.status(500).json({ error: 'Error al actualizar las características de la marca.' });
  }
});

// ── Ventas (Neon) ─────────────────────────────────────────────────
app.post('/api/sales', async (req, res) => {
  const { acon_brand_id, section_id, created_by, total, items } = req.body;

  if (!acon_brand_id || !total || !items?.length) {
    return res.status(400).json({ error: 'Faltan datos de la venta' });
  }

  try {
    await query('BEGIN');

    // 1. Verificar si la marca es de Aourum o Local
    const brandRes = await query(
      'SELECT aourum_brand_id FROM acon_brands WHERE id = $1',
      [acon_brand_id]
    );
    if (brandRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }
    const isAourum = brandRes.rows[0].aourum_brand_id !== null;

    // 2. Insertar en acon_sales
    const saleResult = await query(
      `INSERT INTO acon_sales (acon_brand_id, section_id, created_by, total, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [acon_brand_id, section_id || null, created_by, total]
    );

    const saleId = saleResult.rows[0].id;

    // 3. Procesar cada item (insertar y descontar stock)
    for (const item of items) {
      await query(
        `INSERT INTO acon_sale_items (sale_id, aourum_product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, item.aourum_product_id, item.product_name, item.unit_price, item.quantity]
      );

      if (item.aourum_product_id) {
        if (isAourum) {
          // Caso Aourum: Decrementar en acon_aourum_product_stocks
          await query(
            `INSERT INTO acon_aourum_product_stocks (acon_brand_id, aourum_product_id, stock)
             VALUES ($1, $2, 0)
             ON CONFLICT (acon_brand_id, aourum_product_id)
             DO UPDATE SET stock = GREATEST(0, acon_aourum_product_stocks.stock - $3)`,
            [Number(acon_brand_id), Number(item.aourum_product_id), Number(item.quantity)]
          );
        } else {
          // Caso Local: Decrementar en acon_products
          await query(
            `UPDATE acon_products
             SET stock = GREATEST(0, stock - $1)
             WHERE id = $2 AND acon_brand_id = $3`,
            [Number(item.quantity), Number(item.aourum_product_id), Number(acon_brand_id)]
          );
        }
      }
    }

    await query('COMMIT');
    return res.status(201).json({ id: saleId, message: 'Venta registrada' });
  } catch (error: unknown) {
    await query('ROLLBACK');
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error saving sale:', msg);
    return res.status(500).json({ error: msg });
  }
});

// ── Historial de Ventas por Marca o Sección (Neon) ─────────────────
app.get('/api/sales', async (req, res) => {
  const { acon_brand_id, section_id } = req.query;
  if (!acon_brand_id) {
    return res.status(400).json({ error: 'acon_brand_id es requerido' });
  }

  try {
    let sql = `
      SELECT s.id as sale_id, s.created_by, s.total, s.created_at,
             si.id as item_id, si.aourum_product_id, si.product_name, si.unit_price, si.quantity
      FROM acon_sales s
      LEFT JOIN acon_sale_items si ON s.id = si.sale_id
      WHERE s.acon_brand_id = $1
    `;
    const params: unknown[] = [acon_brand_id];

    if (section_id) {
      sql += ` AND s.section_id = $2`;
      params.push(section_id);
    }

    sql += ` ORDER BY s.created_at DESC`;

    const result = await query(sql, params);

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

// Búsqueda de usuarios para colaboradores
app.get('/api/users/search', async (req, res) => {
  const { q, brand_id } = req.query;
  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.json([]);
  }
  const searchPattern = `%${q.trim()}%`;
  try {
    let sql = `
      SELECT username, first_name, last_name 
      FROM acon_users 
      WHERE (username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)
    `;
    const params: any[] = [searchPattern];
    
    if (brand_id) {
      sql += `
        AND username NOT IN (
          SELECT owner_username FROM acon_brands WHERE id = $2
        )
        AND username NOT IN (
          SELECT username FROM acon_brand_collaborators WHERE acon_brand_id = $2
        )
      `;
      params.push(Number(brand_id));
    }
    
    sql += ` ORDER BY username ASC LIMIT 10`;
    
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ error: 'Error al buscar usuarios.' });
  }
});

// ── Colaboradores de Marca ───────────────────────────────────────
// Obtener colaboradores
app.get('/api/brands/:id/collaborators', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT u.username, u.first_name, u.last_name 
       FROM acon_brand_collaborators c
       JOIN acon_users u ON c.username = u.username
       WHERE c.acon_brand_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error getting collaborators:', error);
    return res.status(500).json({ error: 'Error al obtener colaboradores.' });
  }
});

// Agregar colaborador (Owner only)
app.post('/api/brands/:id/collaborators', async (req, res) => {
  const { id } = req.params;
  const { username, owner_username } = req.body;
  if (!username || !owner_username) {
    return res.status(400).json({ error: 'username y owner_username son requeridos' });
  }

  try {
    // 1. Verificar que el solicitante sea el propietario
    const ownerRes = await query('SELECT owner_username FROM acon_brands WHERE id = $1', [id]);
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }
    if (ownerRes.rows[0].owner_username !== owner_username) {
      return res.status(403).json({ error: 'Solo el propietario de la marca puede gestionar colaboradores.' });
    }

    // 2. Verificar que el colaborador no sea el mismo propietario
    if (username.trim() === ownerRes.rows[0].owner_username) {
      return res.status(400).json({ error: 'El propietario no puede ser agregado como colaborador.' });
    }

    // 3. Verificar que el colaborador exista en acon_users
    const userRes = await query('SELECT username FROM acon_users WHERE username = $1', [username.trim()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'El usuario de Acon no existe.' });
    }

    // 4. Agregar a colaboradores
    await query(
      'INSERT INTO acon_brand_collaborators (acon_brand_id, username) VALUES ($1, $2)',
      [id, username.trim()]
    );
    return res.status(201).json({ message: 'Colaborador agregado con éxito' });
  } catch (error: any) {
    if (error.code === '23505') { // Violación de constraint único
      return res.status(400).json({ error: 'El usuario ya es colaborador de esta marca.' });
    }
    console.error('Error adding collaborator:', error);
    return res.status(500).json({ error: 'Error al agregar colaborador.' });
  }
});

// Eliminar colaborador (Owner only)
app.delete('/api/brands/:id/collaborators/:username', async (req, res) => {
  const { id, username } = req.params;
  const { owner_username } = req.query;

  if (!owner_username) {
    return res.status(400).json({ error: 'owner_username es requerido' });
  }

  try {
    // Verificar que el solicitante sea el propietario
    const ownerRes = await query('SELECT owner_username FROM acon_brands WHERE id = $1', [id]);
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada.' });
    }
    if (ownerRes.rows[0].owner_username !== owner_username) {
      return res.status(403).json({ error: 'Solo el propietario de la marca puede gestionar colaboradores.' });
    }

    await query(
      'DELETE FROM acon_brand_collaborators WHERE acon_brand_id = $1 AND username = $2',
      [id, username]
    );
    return res.json({ message: 'Colaborador removido con éxito.' });
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    return res.status(500).json({ error: 'Error al remover colaborador.' });
  }
});

// ── Secciones de Venta (Ferias) ──────────────────────────────────
// Obtener secciones con agregación de ventas
app.get('/api/brands/:id/sections', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT s.id, s.name, s.created_by, s.created_at,
              COUNT(sl.id) as sales_count,
              COALESCE(SUM(sl.total), 0) as total_sales
       FROM acon_sections s
       LEFT JOIN acon_sales sl ON s.id = sl.section_id
       WHERE s.acon_brand_id = $1
       GROUP BY s.id, s.name, s.created_by, s.created_at
       ORDER BY s.created_at DESC`,
      [id]
    );

    const sections = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      created_by: row.created_by,
      created_at: row.created_at,
      sales_count: Number(row.sales_count),
      total_sales: Number(row.total_sales)
    }));

    return res.json(sections);
  } catch (error) {
    console.error('Error getting brand sections:', error);
    return res.status(500).json({ error: 'Error al obtener secciones.' });
  }
});

// Crear sección
app.post('/api/brands/:id/sections', async (req, res) => {
  const { id } = req.params;
  const { name, created_by } = req.body;
  if (!name || !created_by) {
    return res.status(400).json({ error: 'name y created_by son requeridos' });
  }

  try {
    const result = await query(
      `INSERT INTO acon_sections (acon_brand_id, name, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, name.trim(), created_by]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating section:', error);
    return res.status(500).json({ error: 'Error al crear la sección.' });
  }
});

// Eliminar sección
app.delete('/api/sections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      'DELETE FROM acon_sections WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sección no encontrada.' });
    }
    return res.json({ message: 'Sección eliminada con éxito.' });
  } catch (error) {
    console.error('Error deleting section:', error);
    return res.status(500).json({ error: 'Error al eliminar la sección.' });
  }
});

// Obtener catálogo seleccionado para la sección
app.get('/api/sections/:sectionId/products', async (req, res) => {
  const { sectionId } = req.params;
  try {
    const sectionRes = await query(
      'SELECT acon_brand_id FROM acon_sections WHERE id = $1',
      [sectionId]
    );
    if (sectionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sección no encontrada' });
    }
    const brandId = sectionRes.rows[0].acon_brand_id;
    
    // Obtener los product_ids asignados a la sección
    const assignedRes = await query(
      'SELECT product_id FROM acon_section_products WHERE section_id = $1',
      [sectionId]
    );
    const assignedIds = new Set(assignedRes.rows.map(r => r.product_id));

    // Obtener la información de marca para saber el tipo (local o Aourum)
    const brandRes = await query('SELECT aourum_brand_id FROM acon_brands WHERE id = $1', [brandId]);
    const aourumBrandId = brandRes.rows[0].aourum_brand_id;

    let allProducts = [];
    if (aourumBrandId !== null) {
      const { data, error } = await aourumSupabase
        .from('products')
        .select('id, name, description, price, stock, image, category')
        .eq('brand_id', aourumBrandId);
      if (error) throw error;

      // Combinar con stocks locales de Acon
      const stocksRes = await query(
        'SELECT aourum_product_id, stock FROM acon_aourum_product_stocks WHERE acon_brand_id = $1',
        [brandId]
      );
      const stocksMap = new Map(stocksRes.rows.map(r => [Number(r.aourum_product_id), Number(r.stock)]));

      allProducts = (data || []).map(p => ({
        ...p,
        stock: stocksMap.has(Number(p.id)) ? stocksMap.get(Number(p.id)) : 0
      }));
    } else {
      const localProducts = await query(
        'SELECT * FROM acon_products WHERE acon_brand_id = $1 ORDER BY created_at DESC',
        [brandId]
      );
      allProducts = localProducts.rows;
    }

    // Filtrar solo los asignados
    const activeProducts = allProducts.filter(p => assignedIds.has(p.id));
    
    return res.json({
      active: activeProducts,
      allIds: Array.from(assignedIds)
    });
  } catch (error) {
    console.error('Error fetching section products:', error);
    return res.status(500).json({ error: 'Error al obtener productos de la sección.' });
  }
});

// Guardar catálogo seleccionado para la sección
app.post('/api/sections/:sectionId/products', async (req, res) => {
  const { sectionId } = req.params;
  const { productIds } = req.body;
  if (!Array.isArray(productIds)) {
    return res.status(400).json({ error: 'productIds debe ser un arreglo.' });
  }

  try {
    await query('BEGIN');
    
    // Limpiar catálogo previo de la sección
    await query('DELETE FROM acon_section_products WHERE section_id = $1', [sectionId]);
    
    // Insertar nueva selección
    for (const pId of productIds) {
      await query(
        'INSERT INTO acon_section_products (section_id, product_id) VALUES ($1, $2)',
        [sectionId, pId]
      );
    }
    
    await query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error setting section products:', error);
    return res.status(500).json({ error: 'Error al guardar catálogo de la sección.' });
  }
});

// ── Start ─────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Acon Backend corriendo en http://localhost:${PORT}`);
  });
});
