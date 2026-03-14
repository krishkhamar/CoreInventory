-- CoreInventory Database Schema
CREATE DATABASE IF NOT EXISTS core_inventory;
USE core_inventory;

-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Codes
CREATE TABLE otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses
CREATE TABLE warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations (within warehouses)
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- Products
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT,
    unit_of_measure VARCHAR(30) DEFAULT 'Units',
    reorder_point INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Stock (per product per location)
CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity INT DEFAULT 0,
    UNIQUE KEY unique_stock (product_id, location_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Receipts (Incoming Goods)
CREATE TABLE receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(50),
    supplier_name VARCHAR(150),
    status ENUM('Draft','Waiting','Ready','Done','Canceled') DEFAULT 'Draft',
    scheduled_date DATE,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE receipt_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id INT NOT NULL,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Delivery Orders (Outgoing Goods)
CREATE TABLE delivery_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(50),
    customer_name VARCHAR(150),
    status ENUM('Draft','Waiting','Ready','Done','Canceled') DEFAULT 'Draft',
    scheduled_date DATE,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE delivery_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_id INT NOT NULL,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (delivery_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Internal Transfers
CREATE TABLE transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(50),
    source_location_id INT NOT NULL,
    dest_location_id INT NOT NULL,
    status ENUM('Draft','Waiting','Ready','Done','Canceled') DEFAULT 'Draft',
    scheduled_date DATE,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_location_id) REFERENCES locations(id),
    FOREIGN KEY (dest_location_id) REFERENCES locations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE transfer_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Stock Adjustments
CREATE TABLE adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(50),
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    old_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reason TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Move History (Stock Ledger)
CREATE TABLE move_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('receipt','delivery','transfer','adjustment') NOT NULL,
    reference_id INT NOT NULL,
    product_id INT NOT NULL,
    location_id INT,
    quantity_change INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Seed data
INSERT INTO categories (name, description) VALUES
('Raw Materials', 'Unprocessed materials used in manufacturing'),
('Finished Goods', 'Completed products ready for sale'),
('Packaging', 'Packaging materials and containers'),
('Spare Parts', 'Replacement parts and components'),
('Office Supplies', 'General office consumables');

INSERT INTO warehouses (name, address) VALUES
('Main Warehouse', '123 Industrial Area, Block A'),
('Secondary Warehouse', '456 Commerce Park, Block B');

INSERT INTO locations (warehouse_id, name) VALUES
(1, 'Receiving Dock'),
(1, 'Main Storage'),
(1, 'Production Floor'),
(1, 'Shipping Area'),
(2, 'Storage Zone A'),
(2, 'Storage Zone B');

INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_point) VALUES
('Steel Rods', 'STL-001', 1, 'kg', 50),
('Aluminum Sheets', 'ALM-002', 1, 'sheets', 30),
('Wooden Chairs', 'WCH-003', 2, 'units', 20),
('Cardboard Boxes', 'CBX-004', 3, 'units', 100),
('Bolts & Nuts Set', 'BNS-005', 4, 'sets', 40);

INSERT INTO stock (product_id, location_id, quantity) VALUES
(1, 2, 200), (1, 3, 50),
(2, 2, 100), (2, 5, 30),
(3, 2, 75), (3, 4, 10),
(4, 2, 500), (4, 6, 200),
(5, 2, 150), (5, 3, 25);
