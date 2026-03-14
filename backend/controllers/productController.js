const pool = require('../config/db');

// List products with optional filters
exports.getProducts = async (req, res) => {
    try {
        const { search, category_id, stock_status } = req.query;
        let sql = `SELECT p.*, c.name as category_name,
                   COALESCE(SUM(s.quantity), 0) as total_stock
                   FROM products p
                   LEFT JOIN categories c ON p.category_id = c.id
                   LEFT JOIN stock s ON p.id = s.product_id`;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category_id) {
            conditions.push('p.category_id = ?');
            params.push(category_id);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

        const [rows] = await pool.query(sql, params);

        let filtered = rows;
        if (stock_status === 'low') {
            filtered = rows.filter(r => r.total_stock > 0 && r.total_stock <= r.reorder_point);
        } else if (stock_status === 'out') {
            filtered = rows.filter(r => r.total_stock === 0);
        }
        res.json(filtered);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
};

// Get single product with stock per location
exports.getProduct = async (req, res) => {
    try {
        const [products] = await pool.query(
            `SELECT p.*, c.name as category_name FROM products p
             LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`, [req.params.id]
        );
        if (products.length === 0) return res.status(404).json({ error: 'Product not found.' });
        const [stockRows] = await pool.query(
            `SELECT s.*, l.name as location_name, w.name as warehouse_name
             FROM stock s
             JOIN locations l ON s.location_id = l.id
             JOIN warehouses w ON l.warehouse_id = w.id
             WHERE s.product_id = ?`, [req.params.id]
        );
        res.json({ ...products[0], stock: stockRows });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

// Create product
exports.createProduct = async (req, res) => {
    try {
        const { name, sku, category_id, unit_of_measure, reorder_point, initial_stock, location_id } = req.body;
        if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required.' });

        const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
        if (existing.length > 0) return res.status(409).json({ error: 'SKU already exists.' });

        const [result] = await pool.query(
            'INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_point) VALUES (?, ?, ?, ?, ?)',
            [name, sku, category_id || null, unit_of_measure || 'Units', reorder_point || 10]
        );

        if (initial_stock && location_id) {
            await pool.query(
                'INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)',
                [result.insertId, location_id, initial_stock]
            );
        }
        res.status(201).json({ message: 'Product created.', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { name, sku, category_id, unit_of_measure, reorder_point } = req.body;
        await pool.query(
            'UPDATE products SET name = ?, sku = ?, category_id = ?, unit_of_measure = ?, reorder_point = ? WHERE id = ?',
            [name, sku, category_id || null, unit_of_measure, reorder_point, req.params.id]
        );
        res.json({ message: 'Product updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

// Categories
exports.getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const [result] = await pool.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description || null]);
        res.status(201).json({ message: 'Category created.', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        await pool.query('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
        res.json({ message: 'Category updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};
