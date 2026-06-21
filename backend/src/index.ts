import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aourumSupabase, aconSupabase } from './supabaseClients.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoint de prueba de estado
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Acon Backend is running.' });
});

// Endpoint para listar las marcas de Aourum (Útil para vincular en el onboarding)
app.get('/api/brands', async (req, res) => {
  try {
    const { data, error } = await aourumSupabase
      .from('brands')
      .select('id, name, logo, owner, category');

    if (error) {
      throw error;
    }
    return res.json(data);
  } catch (error: any) {
    console.error('Error fetching Aourum brands:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener los productos de una marca específica de Aourum
app.get('/api/products', async (req, res) => {
  try {
    const { brand_id } = req.query;
    if (!brand_id) {
      return res.status(400).json({ error: 'brand_id query parameter is required' });
    }

    // Nota: Suponemos que la tabla de productos tiene una relación con la de marcas.
    // Si la columna de relación tiene otro nombre, se puede ajustar aquí o filtrar.
    const { data, error } = await aourumSupabase
      .from('products')
      .select('*')
      .eq('brand_id', brand_id);

    if (error) {
      throw error;
    }
    return res.json(data);
  } catch (error: any) {
    console.error('Error fetching Aourum products:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
