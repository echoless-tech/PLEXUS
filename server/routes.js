const express = require('express');
const { query } = require('./db');

const router = express.Router();

// ================== PRODUCTS ==================

// GET all products
router.get('/products', async (req, res) => {
  try {
    const products = await query(
      'SELECT id, sku, name, description, category, quantity, reorder_level AS reorderLevel, price, cost_price AS costPrice, unit, image_url AS imageUrl, supplier_id AS supplierId, created_at AS createdAt, updated_at AS updatedAt FROM products ORDER BY name'
    );
    res.json(products);
  } catch (err) {
    console.error('Get products error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST create product
router.post('/products', async (req, res) => {
  try {
    const { id, sku, name, description, category, quantity, reorderLevel, price, costPrice, unit, imageUrl, supplierId } = req.body;
    const productId = id || crypto.randomUUID();
    await query(
      `INSERT INTO products (id, sku, name, description, category, quantity, reorder_level, price, cost_price, unit, image_url, supplier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, sku, name, description || '', category || '', quantity || 0, reorderLevel || 10, price, costPrice, unit || 'piece', imageUrl || null, supplierId || null]
    );
    const [product] = await query('SELECT id, sku, name, description, category, quantity, reorder_level AS reorderLevel, price, cost_price AS costPrice, unit, image_url AS imageUrl, supplier_id AS supplierId, created_at AS createdAt, updated_at AS updatedAt FROM products WHERE id = ?', [productId]);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const allowed = { name: 'name', description: 'description', category: 'category', quantity: 'quantity', reorderLevel: 'reorder_level', price: 'price', costPrice: 'cost_price', unit: 'unit', imageUrl: 'image_url', supplierId: 'supplier_id', sku: 'sku' };

    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(fields[key]);
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);

    await query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, values);
    const [product] = await query('SELECT id, sku, name, description, category, quantity, reorder_level AS reorderLevel, price, cost_price AS costPrice, unit, image_url AS imageUrl, supplier_id AS supplierId, created_at AS createdAt, updated_at AS updatedAt FROM products WHERE id = ?', [id]);
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST adjust stock
router.post('/products/:id/adjust-stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;
    const absQty = Math.abs(quantity);

    // Get current quantity
    const [product] = await query('SELECT quantity FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let newQty = product.quantity;
    if (type === 'in') newQty += absQty;
    else if (type === 'out') newQty -= absQty;
    else newQty = quantity; // adjustment sets exact

    newQty = Math.max(0, newQty);

    await query('UPDATE products SET quantity = ? WHERE id = ?', [newQty, id]);
    await query(
      'INSERT INTO stock_movements (id, product_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), id, type, absQty, reason || '']
    );

    res.json({ id, newQuantity: newQty });
  } catch (err) {
    console.error('Adjust stock error:', err.message);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// GET stock movements
router.get('/stock-movements', async (req, res) => {
  try {
    const movements = await query(
      'SELECT id, product_id AS productId, type, quantity, reason, reference, created_at AS createdAt FROM stock_movements ORDER BY created_at DESC LIMIT 100'
    );
    res.json(movements);
  } catch (err) {
    console.error('Get movements error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// ================== SALES ==================

// GET all sales
router.get('/sales', async (req, res) => {
  try {
    const sales = await query(
      'SELECT id, invoice_number AS invoiceNumber, customer_id AS customerId, customer_name AS customerName, subtotal, tax, total, payment_method AS paymentMethod, status, created_at AS createdAt, due_date AS dueDate FROM sales ORDER BY created_at DESC'
    );

    // Fetch items for each sale
    for (const sale of sales) {
      sale.items = await query(
        'SELECT product_id AS productId, product_name AS productName, quantity, unit_price AS unitPrice, total FROM sale_items WHERE sale_id = ?',
        [sale.id]
      );
    }

    res.json(sales);
  } catch (err) {
    console.error('Get sales error:', err.message);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// POST create sale
router.post('/sales', async (req, res) => {
  try {
    const { id, invoiceNumber, customerId, customerName, items, subtotal, tax, total, paymentMethod, status, dueDate } = req.body;
    const saleId = id || crypto.randomUUID();

    await query(
      `INSERT INTO sales (id, invoice_number, customer_id, customer_name, subtotal, tax, total, payment_method, status, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, invoiceNumber, customerId || null, customerName || '', subtotal, tax || 0, total, paymentMethod || 'cash', status || 'pending', dueDate || null]
    );

    // Insert sale items and adjust stock
    for (const item of items) {
      await query(
        'INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), saleId, item.productId, item.productName, item.quantity, item.unitPrice, item.total]
      );
      // Reduce product stock
      await query('UPDATE products SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', [item.quantity, item.productId]);
    }

    const [sale] = await query('SELECT id, invoice_number AS invoiceNumber, customer_name AS customerName, total, status, created_at AS createdAt FROM sales WHERE id = ?', [saleId]);
    sale.items = items;
    res.status(201).json(sale);
  } catch (err) {
    console.error('Create sale error:', err.message);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// PUT update sale status
router.put('/sales/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await query('UPDATE sales SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update sale status error:', err.message);
    res.status(500).json({ error: 'Failed to update sale status' });
  }
});

// ================== SUPPLIERS ==================

// GET all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await query(
      'SELECT id, name, contact_person AS contactPerson, email, phone, address, products_supplied AS productsSupplied, last_order_date AS lastOrderDate, rating, created_at AS createdAt, updated_at AS updatedAt FROM suppliers ORDER BY name'
    );
    // Parse JSON fields
    for (const s of suppliers) {
      if (typeof s.productsSupplied === 'string') {
        s.productsSupplied = JSON.parse(s.productsSupplied);
      }
    }
    res.json(suppliers);
  } catch (err) {
    console.error('Get suppliers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST create supplier
router.post('/suppliers', async (req, res) => {
  try {
    const { id, name, contactPerson, email, phone, address, productsSupplied, rating } = req.body;
    const supplierId = id || crypto.randomUUID();
    await query(
      `INSERT INTO suppliers (id, name, contact_person, email, phone, address, products_supplied, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [supplierId, name, contactPerson || '', email || '', phone || '', address || '', JSON.stringify(productsSupplied || []), rating || 0]
    );
    res.status(201).json({ id: supplierId, name, contactPerson, email, phone, address, productsSupplied, rating });
  } catch (err) {
    console.error('Create supplier error:', err.message);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT update supplier
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const allowed = { name: 'name', contactPerson: 'contact_person', email: 'email', phone: 'phone', address: 'address', rating: 'rating' };

    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(fields[key]);
      }
    }
    if (fields.productsSupplied) {
      sets.push('products_supplied = ?');
      values.push(JSON.stringify(fields.productsSupplied));
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);

    await query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Update supplier error:', err.message);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// ================== CASH FLOW ==================

// GET cash flow entries
router.get('/cash-flow', async (req, res) => {
  try {
    const entries = await query(
      'SELECT id, date, type, category, description, amount, reference FROM cash_flow ORDER BY date DESC LIMIT 100'
    );
    res.json(entries);
  } catch (err) {
    console.error('Get cash flow error:', err.message);
    res.status(500).json({ error: 'Failed to fetch cash flow' });
  }
});

// POST cash flow entry
router.post('/cash-flow', async (req, res) => {
  try {
    const { id, date, type, category, description, amount, reference } = req.body;
    const entryId = id || crypto.randomUUID();
    await query(
      'INSERT INTO cash_flow (id, date, type, category, description, amount, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entryId, date || new Date(), type, category || '', description || '', amount, reference || null]
    );
    res.status(201).json({ id: entryId, date, type, category, description, amount, reference });
  } catch (err) {
    console.error('Create cash flow entry error:', err.message);
    res.status(500).json({ error: 'Failed to create cash flow entry' });
  }
});

// ================== BUSINESS PROFILE ==================

// GET business profile
router.get('/business-profile', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, tagline, description, logo, cover_image AS coverImage, phone, email, address, whatsapp, instagram, facebook FROM business_profile LIMIT 1'
    );
    if (rows.length === 0) return res.json(null);

    const p = rows[0];
    res.json({
      ...p,
      socialLinks: { whatsapp: p.whatsapp, instagram: p.instagram, facebook: p.facebook },
    });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT update business profile
router.put('/business-profile', async (req, res) => {
  try {
    const fields = req.body;
    const allowed = { name: 'name', tagline: 'tagline', description: 'description', logo: 'logo', coverImage: 'cover_image', phone: 'phone', email: 'email', address: 'address' };

    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(fields[key]);
      }
    }
    if (fields.socialLinks) {
      if (fields.socialLinks.whatsapp !== undefined) { sets.push('whatsapp = ?'); values.push(fields.socialLinks.whatsapp); }
      if (fields.socialLinks.instagram !== undefined) { sets.push('instagram = ?'); values.push(fields.socialLinks.instagram); }
      if (fields.socialLinks.facebook !== undefined) { sets.push('facebook = ?'); values.push(fields.socialLinks.facebook); }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    // Update the first (only) profile row
    await query(`UPDATE business_profile SET ${sets.join(', ')} ORDER BY created_at LIMIT 1`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
