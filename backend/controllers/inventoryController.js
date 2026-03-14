const pool = require('../config/db');

// ==================== RECEIPTS ====================
exports.getReceipts = async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT r.*, u.name as created_by FROM receipts r LEFT JOIN users u ON r.user_id = u.id';
        const params = [];
        if (status) { sql += ' WHERE r.status = ?'; params.push(status); }
        sql += ' ORDER BY r.created_at DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.getReceipt = async (req, res) => {
    try {
        const [receipts] = await pool.query('SELECT r.*, u.name as created_by FROM receipts r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?', [req.params.id]);
        if (receipts.length === 0) return res.status(404).json({ error: 'Receipt not found.' });
        const [items] = await pool.query(
            `SELECT ri.*, p.name as product_name, p.sku, l.name as location_name
             FROM receipt_items ri
             JOIN products p ON ri.product_id = p.id
             JOIN locations l ON ri.location_id = l.id
             WHERE ri.receipt_id = ?`, [req.params.id]
        );
        res.json({ ...receipts[0], items });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.createReceipt = async (req, res) => {
    try {
        const { supplier_name, scheduled_date, items } = req.body;
        const ref = 'REC-' + Date.now().toString(36).toUpperCase();
        const [result] = await pool.query(
            'INSERT INTO receipts (reference, supplier_name, scheduled_date, user_id) VALUES (?, ?, ?, ?)',
            [ref, supplier_name, scheduled_date || null, req.user.id]
        );
        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO receipt_items (receipt_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)',
                    [result.insertId, item.product_id, item.location_id, item.quantity]
                );
            }
        }
        res.status(201).json({ message: 'Receipt created.', id: result.insertId, reference: ref });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
};

exports.validateReceipt = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [receipts] = await conn.query('SELECT * FROM receipts WHERE id = ? AND status != "Done"', [req.params.id]);
        if (receipts.length === 0) return res.status(400).json({ error: 'Receipt not found or already validated.' });

        const [items] = await conn.query('SELECT * FROM receipt_items WHERE receipt_id = ?', [req.params.id]);
        for (const item of items) {
            await conn.query(
                `INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                [item.product_id, item.location_id, item.quantity, item.quantity]
            );
            await conn.query(
                `INSERT INTO move_history (type, reference_id, product_id, location_id, quantity_change, description)
                 VALUES ('receipt', ?, ?, ?, ?, ?)`,
                [req.params.id, item.product_id, item.location_id, item.quantity, `Receipt ${receipts[0].reference}`]
            );
        }
        await conn.query('UPDATE receipts SET status = "Done" WHERE id = ?', [req.params.id]);
        await conn.commit();
        res.json({ message: 'Receipt validated. Stock updated.' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
};

exports.cancelReceipt = async (req, res) => {
    try {
        await pool.query('UPDATE receipts SET status = "Canceled" WHERE id = ? AND status != "Done"', [req.params.id]);
        res.json({ message: 'Receipt canceled.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

// ==================== DELIVERY ORDERS ====================
exports.getDeliveries = async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT d.*, u.name as created_by FROM delivery_orders d LEFT JOIN users u ON d.user_id = u.id';
        const params = [];
        if (status) { sql += ' WHERE d.status = ?'; params.push(status); }
        sql += ' ORDER BY d.created_at DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.getDelivery = async (req, res) => {
    try {
        const [deliveries] = await pool.query('SELECT d.*, u.name as created_by FROM delivery_orders d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?', [req.params.id]);
        if (deliveries.length === 0) return res.status(404).json({ error: 'Delivery not found.' });
        const [items] = await pool.query(
            `SELECT di.*, p.name as product_name, p.sku, l.name as location_name
             FROM delivery_items di
             JOIN products p ON di.product_id = p.id
             JOIN locations l ON di.location_id = l.id
             WHERE di.delivery_id = ?`, [req.params.id]
        );
        res.json({ ...deliveries[0], items });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.createDelivery = async (req, res) => {
    try {
        const { customer_name, scheduled_date, items } = req.body;
        const ref = 'DEL-' + Date.now().toString(36).toUpperCase();
        const [result] = await pool.query(
            'INSERT INTO delivery_orders (reference, customer_name, scheduled_date, user_id) VALUES (?, ?, ?, ?)',
            [ref, customer_name, scheduled_date || null, req.user.id]
        );
        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO delivery_items (delivery_id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)',
                    [result.insertId, item.product_id, item.location_id, item.quantity]
                );
            }
        }
        res.status(201).json({ message: 'Delivery order created.', id: result.insertId, reference: ref });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
};

exports.validateDelivery = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [deliveries] = await conn.query('SELECT * FROM delivery_orders WHERE id = ? AND status != "Done"', [req.params.id]);
        if (deliveries.length === 0) return res.status(400).json({ error: 'Delivery not found or already validated.' });

        const [items] = await conn.query('SELECT * FROM delivery_items WHERE delivery_id = ?', [req.params.id]);
        for (const item of items) {
            const [stockRows] = await conn.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [item.product_id, item.location_id]);
            if (stockRows.length === 0 || stockRows[0].quantity < item.quantity) {
                await conn.rollback();
                return res.status(400).json({ error: `Insufficient stock for product ID ${item.product_id}.` });
            }
            await conn.query('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?',
                [item.quantity, item.product_id, item.location_id]);
            await conn.query(
                `INSERT INTO move_history (type, reference_id, product_id, location_id, quantity_change, description)
                 VALUES ('delivery', ?, ?, ?, ?, ?)`,
                [req.params.id, item.product_id, item.location_id, -item.quantity, `Delivery ${deliveries[0].reference}`]
            );
        }
        await conn.query('UPDATE delivery_orders SET status = "Done" WHERE id = ?', [req.params.id]);
        await conn.commit();
        res.json({ message: 'Delivery validated. Stock updated.' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
};

exports.cancelDelivery = async (req, res) => {
    try {
        await pool.query('UPDATE delivery_orders SET status = "Canceled" WHERE id = ? AND status != "Done"', [req.params.id]);
        res.json({ message: 'Delivery canceled.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

// ==================== TRANSFERS ====================
exports.getTransfers = async (req, res) => {
    try {
        const { status } = req.query;
        let sql = `SELECT t.*, sl.name as source_location, dl.name as dest_location,
                   sw.name as source_warehouse, dw.name as dest_warehouse, u.name as created_by
                   FROM transfers t
                   JOIN locations sl ON t.source_location_id = sl.id
                   JOIN warehouses sw ON sl.warehouse_id = sw.id
                   JOIN locations dl ON t.dest_location_id = dl.id
                   JOIN warehouses dw ON dl.warehouse_id = dw.id
                   LEFT JOIN users u ON t.user_id = u.id`;
        const params = [];
        if (status) { sql += ' WHERE t.status = ?'; params.push(status); }
        sql += ' ORDER BY t.created_at DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.getTransfer = async (req, res) => {
    try {
        const [transfers] = await pool.query(
            `SELECT t.*, sl.name as source_location, dl.name as dest_location,
             sw.name as source_warehouse, dw.name as dest_warehouse
             FROM transfers t
             JOIN locations sl ON t.source_location_id = sl.id
             JOIN warehouses sw ON sl.warehouse_id = sw.id
             JOIN locations dl ON t.dest_location_id = dl.id
             JOIN warehouses dw ON dl.warehouse_id = dw.id
             WHERE t.id = ?`, [req.params.id]
        );
        if (transfers.length === 0) return res.status(404).json({ error: 'Transfer not found.' });
        const [items] = await pool.query(
            `SELECT ti.*, p.name as product_name, p.sku FROM transfer_items ti
             JOIN products p ON ti.product_id = p.id WHERE ti.transfer_id = ?`, [req.params.id]
        );
        res.json({ ...transfers[0], items });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.createTransfer = async (req, res) => {
    try {
        const { source_location_id, dest_location_id, scheduled_date, items } = req.body;
        const ref = 'TRF-' + Date.now().toString(36).toUpperCase();
        const [result] = await pool.query(
            'INSERT INTO transfers (reference, source_location_id, dest_location_id, scheduled_date, user_id) VALUES (?, ?, ?, ?, ?)',
            [ref, source_location_id, dest_location_id, scheduled_date || null, req.user.id]
        );
        if (items && items.length > 0) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)',
                    [result.insertId, item.product_id, item.quantity]
                );
            }
        }
        res.status(201).json({ message: 'Transfer created.', id: result.insertId, reference: ref });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
};

exports.validateTransfer = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [transfers] = await conn.query('SELECT * FROM transfers WHERE id = ? AND status != "Done"', [req.params.id]);
        if (transfers.length === 0) return res.status(400).json({ error: 'Transfer not found or already validated.' });

        const transfer = transfers[0];
        const [items] = await conn.query('SELECT * FROM transfer_items WHERE transfer_id = ?', [req.params.id]);

        for (const item of items) {
            const [stockRows] = await conn.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
                [item.product_id, transfer.source_location_id]);
            if (stockRows.length === 0 || stockRows[0].quantity < item.quantity) {
                await conn.rollback();
                return res.status(400).json({ error: `Insufficient stock for product ID ${item.product_id} at source.` });
            }
            // Decrease source
            await conn.query('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?',
                [item.quantity, item.product_id, transfer.source_location_id]);
            // Increase destination
            await conn.query(
                `INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                [item.product_id, transfer.dest_location_id, item.quantity, item.quantity]
            );
            // Log both movements
            await conn.query(
                `INSERT INTO move_history (type, reference_id, product_id, location_id, quantity_change, description)
                 VALUES ('transfer', ?, ?, ?, ?, ?), ('transfer', ?, ?, ?, ?, ?)`,
                [req.params.id, item.product_id, transfer.source_location_id, -item.quantity, `Transfer out ${transfer.reference}`,
                 req.params.id, item.product_id, transfer.dest_location_id, item.quantity, `Transfer in ${transfer.reference}`]
            );
        }
        await conn.query('UPDATE transfers SET status = "Done" WHERE id = ?', [req.params.id]);
        await conn.commit();
        res.json({ message: 'Transfer validated. Stock moved.' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
};

// ==================== ADJUSTMENTS ====================
exports.getAdjustments = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.*, p.name as product_name, p.sku, l.name as location_name, u.name as created_by
             FROM adjustments a
             JOIN products p ON a.product_id = p.id
             JOIN locations l ON a.location_id = l.id
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC`
        );
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.createAdjustment = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { product_id, location_id, new_quantity, reason } = req.body;

        const [stockRows] = await conn.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [product_id, location_id]);
        const oldQty = stockRows.length > 0 ? stockRows[0].quantity : 0;
        const ref = 'ADJ-' + Date.now().toString(36).toUpperCase();

        const [result] = await conn.query(
            'INSERT INTO adjustments (reference, product_id, location_id, old_quantity, new_quantity, reason, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ref, product_id, location_id, oldQty, new_quantity, reason || null, req.user.id]
        );

        await conn.query(
            `INSERT INTO stock (product_id, location_id, quantity) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = ?`,
            [product_id, location_id, new_quantity, new_quantity]
        );

        await conn.query(
            `INSERT INTO move_history (type, reference_id, product_id, location_id, quantity_change, description)
             VALUES ('adjustment', ?, ?, ?, ?, ?)`,
            [result.insertId, product_id, location_id, new_quantity - oldQty, `Adjustment ${ref}: ${oldQty} → ${new_quantity}`]
        );

        await conn.commit();
        res.status(201).json({ message: 'Stock adjusted.', id: result.insertId, reference: ref });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    } finally { conn.release(); }
};

// ==================== MOVE HISTORY ====================
exports.getMoveHistory = async (req, res) => {
    try {
        const { type, product_id } = req.query;
        let sql = `SELECT mh.*, p.name as product_name, p.sku, l.name as location_name
                   FROM move_history mh
                   JOIN products p ON mh.product_id = p.id
                   LEFT JOIN locations l ON mh.location_id = l.id`;
        const params = [];
        const conditions = [];
        if (type) { conditions.push('mh.type = ?'); params.push(type); }
        if (product_id) { conditions.push('mh.product_id = ?'); params.push(product_id); }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY mh.created_at DESC LIMIT 200';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

// ==================== DASHBOARD ====================
exports.getDashboard = async (req, res) => {
    try {
        const [totalProducts] = await pool.query('SELECT COUNT(*) as count FROM products');
        const [stockData] = await pool.query(
            `SELECT p.id, p.name, p.reorder_point, COALESCE(SUM(s.quantity), 0) as total_stock
             FROM products p LEFT JOIN stock s ON p.id = s.product_id GROUP BY p.id`
        );
        const lowStock = stockData.filter(p => p.total_stock > 0 && p.total_stock <= p.reorder_point).length;
        const outOfStock = stockData.filter(p => p.total_stock === 0).length;
        const [pendingReceipts] = await pool.query('SELECT COUNT(*) as count FROM receipts WHERE status IN ("Draft","Waiting","Ready")');
        const [pendingDeliveries] = await pool.query('SELECT COUNT(*) as count FROM delivery_orders WHERE status IN ("Draft","Waiting","Ready")');
        const [scheduledTransfers] = await pool.query('SELECT COUNT(*) as count FROM transfers WHERE status IN ("Draft","Waiting","Ready")');
        const [recentActivity] = await pool.query(
            `SELECT mh.*, p.name as product_name FROM move_history mh
             JOIN products p ON mh.product_id = p.id ORDER BY mh.created_at DESC LIMIT 10`
        );

        res.json({
            totalProducts: totalProducts[0].count,
            lowStock,
            outOfStock,
            pendingReceipts: pendingReceipts[0].count,
            pendingDeliveries: pendingDeliveries[0].count,
            scheduledTransfers: scheduledTransfers[0].count,
            lowStockItems: stockData.filter(p => p.total_stock > 0 && p.total_stock <= p.reorder_point),
            recentActivity
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error.' });
    }
};

// ==================== WAREHOUSES & LOCATIONS ====================
exports.getWarehouses = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM warehouses ORDER BY name');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.createWarehouse = async (req, res) => {
    try {
        const { name, address } = req.body;
        const [result] = await pool.query('INSERT INTO warehouses (name, address) VALUES (?, ?)', [name, address || null]);
        res.status(201).json({ message: 'Warehouse created.', id: result.insertId });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.updateWarehouse = async (req, res) => {
    try {
        const { name, address } = req.body;
        await pool.query('UPDATE warehouses SET name = ?, address = ? WHERE id = ?', [name, address, req.params.id]);
        res.json({ message: 'Warehouse updated.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.deleteWarehouse = async (req, res) => {
    try {
        await pool.query('DELETE FROM warehouses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Warehouse deleted.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.getLocations = async (req, res) => {
    try {
        const { warehouse_id } = req.query;
        let sql = 'SELECT l.*, w.name as warehouse_name FROM locations l JOIN warehouses w ON l.warehouse_id = w.id';
        const params = [];
        if (warehouse_id) { sql += ' WHERE l.warehouse_id = ?'; params.push(warehouse_id); }
        sql += ' ORDER BY w.name, l.name';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.createLocation = async (req, res) => {
    try {
        const { warehouse_id, name } = req.body;
        const [result] = await pool.query('INSERT INTO locations (warehouse_id, name) VALUES (?, ?)', [warehouse_id, name]);
        res.status(201).json({ message: 'Location created.', id: result.insertId });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};

exports.deleteLocation = async (req, res) => {
    try {
        await pool.query('DELETE FROM locations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Location deleted.' });
    } catch (err) { res.status(500).json({ error: 'Server error.' }); }
};
