CREATE DATABASE inventory_management;
USE inventory_management;


CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact VARCHAR(20),
    email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

USE inventory_management;

INSERT INTO categories (name)
VALUES
('Electronics'),
('Accessories'),
('Furniture'),
('Stationery');

INSERT INTO suppliers
(name, contact, email)
VALUES
('Tech Solutions Pvt Ltd', '9876543210', 'tech@example.com'),
('ABC Electronics', '9123456780', 'abc@example.com'),
('Global Supplies', '9988776655', 'global@example.com');

INSERT INTO products
(name, category, price, stock)
VALUES
('Laptop', 'Electronics', 55000, 25),
('Wireless Mouse', 'Accessories', 800, 8),
('Keyboard', 'Accessories', 1200, 30),
('Monitor', 'Electronics', 12000, 15),
('Printer', 'Electronics', 18000, 5);


INSERT INTO sales
(product_id, product_name, quantity, amount, sale_date)
VALUES
(1, 'Laptop', 2, 110000, '2026-10-05'),
(2, 'Wireless Mouse', 5, 4000, '2026-10-04'),
(3, 'Keyboard', 3, 3600, '2026-10-03'),
(4, 'Monitor', 2, 24000, '2026-10-02');

SELECT * FROM products;