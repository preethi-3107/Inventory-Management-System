const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

/* =========================================================
   DATABASE CONNECTION
   ========================================================= */

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    return;
  }

  console.log("MySQL connected successfully.");

  connection.release();
});

/* =========================================================
   TEST API
   ========================================================= */

app.get("/", (req, res) => {
  res.json({
    message: "Inventory Management API is running",
  });
});

/* =========================================================
   PRODUCTS
   ========================================================= */

/* GET PRODUCTS */

app.get("/api/products", (req, res) => {
  const sql = "SELECT * FROM products ORDER BY id DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("GET PRODUCTS ERROR:", err);

      return res.status(500).json({
        message: "Failed to fetch products",
      });
    }

    res.json(results);
  });
});

/* ADD PRODUCT */

app.post("/api/products", (req, res) => {
  const { name, category, price, stock } = req.body;

  if (
    typeof name !== "string" ||
    typeof category !== "string" ||
    name.trim() === "" ||
    category.trim() === "" ||
    price === undefined ||
    stock === undefined ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0 ||
    !Number.isInteger(Number(stock)) ||
    Number(stock) < 0
  ) {
    return res.status(400).json({
      message: "Please provide a valid name, category, price, and stock.",
    });
  }

  const productName = name.trim();
  const categoryName = category.trim();
  const productPrice = Number(price);
  const productStock = Number(stock);

  const checkCategorySql = `
    SELECT id
    FROM categories
    WHERE TRIM(LOWER(name)) = TRIM(LOWER(?))
    LIMIT 1
  `;

  db.query(checkCategorySql, [categoryName], (categoryErr, categoryResults) => {
    if (categoryErr) {
      console.error("CHECK CATEGORY ERROR:", categoryErr);

      return res.status(500).json({
        message: "Failed to check category",
      });
    }

    function insertProduct() {
      const productSql = `
          INSERT INTO products (name, category, price, stock)
          VALUES (?, ?, ?, ?)
        `;

      db.query(
        productSql,
        [productName, categoryName, productPrice, productStock],
        (productErr, result) => {
          if (productErr) {
            console.error("ADD PRODUCT ERROR:", productErr);

            return res.status(500).json({
              message: "Failed to add product",
            });
          }

          res.status(201).json({
            message: "Product added successfully",
            id: result.insertId,
          });
        },
      );
    }

    if (categoryResults.length === 0) {
      const addCategorySql = `
          INSERT INTO categories (name)
          VALUES (?)
        `;

      db.query(addCategorySql, [categoryName], (addCategoryErr) => {
        if (addCategoryErr) {
          console.error("ADD CATEGORY ERROR:", addCategoryErr);

          return res.status(500).json({
            message: "Failed to create category",
          });
        }

        insertProduct();
      });
    } else {
      insertProduct();
    }
  });
});

/* EDIT PRODUCT */

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock } = req.body;

  if (
    typeof name !== "string" ||
    typeof category !== "string" ||
    name.trim() === "" ||
    category.trim() === "" ||
    price === undefined ||
    stock === undefined ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0 ||
    !Number.isInteger(Number(stock)) ||
    Number(stock) < 0
  ) {
    return res.status(400).json({
      message: "Please provide valid product details.",
    });
  }

  const productName = name.trim();
  const categoryName = category.trim();

  const checkCategorySql = `
    SELECT id
    FROM categories
    WHERE TRIM(LOWER(name)) = TRIM(LOWER(?))
    LIMIT 1
  `;

  db.query(checkCategorySql, [categoryName], (categoryErr, categoryResults) => {
    if (categoryErr) {
      console.error("CHECK CATEGORY ERROR:", categoryErr);

      return res.status(500).json({
        message: "Failed to check category",
      });
    }

    function updateProduct() {
      const sql = `
          UPDATE products
          SET name = ?, category = ?, price = ?, stock = ?
          WHERE id = ?
        `;

      db.query(
        sql,
        [productName, categoryName, Number(price), Number(stock), id],
        (err, result) => {
          if (err) {
            console.error("UPDATE PRODUCT ERROR:", err);

            return res.status(500).json({
              message: "Failed to update product",
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              message: "Product not found",
            });
          }

          res.json({
            message: "Product updated successfully",
          });
        },
      );
    }

    if (categoryResults.length === 0) {
      db.query(
        "INSERT INTO categories (name) VALUES (?)",
        [categoryName],
        (addCategoryErr) => {
          if (addCategoryErr) {
            console.error("ADD CATEGORY ERROR:", addCategoryErr);

            return res.status(500).json({
              message: "Failed to create category",
            });
          }

          updateProduct();
        },
      );
    } else {
      updateProduct();
    }
  });
});

/* DELETE PRODUCT */

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("DELETE PRODUCT ERROR:", err);

      return res.status(500).json({
        message: "Failed to delete product",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  });
});

/* =========================================================
   CATEGORIES
   ========================================================= */

/* GET CATEGORIES */

app.get("/api/categories", (req, res) => {
  const sql = `
    SELECT
      c.id,
      c.name,
      COUNT(p.id) AS products
    FROM categories c
    LEFT JOIN products p
      ON TRIM(LOWER(c.name)) = TRIM(LOWER(p.category))
    GROUP BY c.id, c.name
    ORDER BY c.id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("GET CATEGORIES ERROR:", err);

      return res.status(500).json({
        message: "Failed to fetch categories",
      });
    }

    res.json(results);
  });
});

/* ADD CATEGORY */

app.post("/api/categories", (req, res) => {
  const { name } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      message: "Category name is required",
    });
  }

  const sql = "INSERT INTO categories (name) VALUES (?)";

  db.query(sql, [name.trim()], (err, result) => {
    if (err) {
      console.error("ADD CATEGORY ERROR:", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Category already exists",
        });
      }

      return res.status(500).json({
        message: "Failed to add category",
      });
    }

    res.status(201).json({
      message: "Category added successfully",
      id: result.insertId,
    });
  });
});

/* EDIT CATEGORY */

app.put("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      message: "Category name is required",
    });
  }

  db.query(
    "UPDATE categories SET name = ? WHERE id = ?",
    [name.trim(), id],
    (err, result) => {
      if (err) {
        console.error("EDIT CATEGORY ERROR:", err);

        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Category already exists",
          });
        }

        return res.status(500).json({
          message: "Failed to update category",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Category not found",
        });
      }

      res.json({
        message: "Category updated successfully",
      });
    },
  );
});

/* DELETE CATEGORY */

app.delete("/api/categories/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM categories WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("DELETE CATEGORY ERROR:", err);

      return res.status(500).json({
        message: "Failed to delete category",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    res.json({
      message: "Category deleted successfully",
    });
  });
});

/* =========================================================
   SUPPLIERS
   ========================================================= */

/* GET SUPPLIERS */

app.get("/api/suppliers", (req, res) => {
  db.query("SELECT * FROM suppliers ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("GET SUPPLIERS ERROR:", err);

      return res.status(500).json({
        message: "Failed to fetch suppliers",
      });
    }

    res.json(results);
  });
});

/* ADD SUPPLIER */

app.post("/api/suppliers", (req, res) => {
  const { name, contact, email } = req.body;

  if (
    typeof name !== "string" ||
    typeof contact !== "string" ||
    typeof email !== "string" ||
    !name.trim() ||
    !contact.trim() ||
    !email.trim()
  ) {
    return res.status(400).json({
      message: "All supplier fields are required",
    });
  }

  const sql = `
    INSERT INTO suppliers (name, contact, email)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [name.trim(), contact.trim(), email.trim()], (err, result) => {
    if (err) {
      console.error("ADD SUPPLIER ERROR:", err);

      return res.status(500).json({
        message: "Failed to add supplier",
      });
    }

    res.status(201).json({
      message: "Supplier added successfully",
      id: result.insertId,
    });
  });
});

/* EDIT SUPPLIER */

app.put("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;
  const { name, contact, email } = req.body;

  if (
    typeof name !== "string" ||
    typeof contact !== "string" ||
    typeof email !== "string" ||
    !name.trim() ||
    !contact.trim() ||
    !email.trim()
  ) {
    return res.status(400).json({
      message: "All supplier fields are required",
    });
  }

  const sql = `
    UPDATE suppliers
    SET name = ?, contact = ?, email = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name.trim(), contact.trim(), email.trim(), id],
    (err, result) => {
      if (err) {
        console.error("EDIT SUPPLIER ERROR:", err);

        return res.status(500).json({
          message: "Failed to update supplier",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Supplier not found",
        });
      }

      res.json({
        message: "Supplier updated successfully",
      });
    },
  );
});

/* DELETE SUPPLIER */

app.delete("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM suppliers WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("DELETE SUPPLIER ERROR:", err);

      return res.status(500).json({
        message: "Failed to delete supplier",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    res.json({
      message: "Supplier deleted successfully",
    });
  });
});

/* =========================================================
   SALES
   ========================================================= */

/* GET SALES */

app.get("/api/sales", (req, res) => {
  db.query("SELECT * FROM sales ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("GET SALES ERROR:", err);

      return res.status(500).json({
        message: "Failed to fetch sales",
      });
    }

    res.json(results);
  });
});

/* HELPER: ROLL BACK A FAILED SALE */

function rollbackSale(connection, res, message, statusCode = 500) {
  connection.rollback((rollbackErr) => {
    if (rollbackErr) {
      console.error("SALE ROLLBACK ERROR:", rollbackErr);
    }

    connection.release();

    return res.status(statusCode).json({
      message,
    });
  });
}

/* RECORD SALE */

app.post("/api/sales", (req, res) => {
  const { product_id, quantity, amount, sale_date } = req.body;

  const productId = Number(product_id);
  const saleQuantity = Number(quantity);
  const saleAmount = Number(amount);

  // Validate incoming information
  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(saleQuantity) ||
    saleQuantity <= 0 ||
    !Number.isFinite(saleAmount) ||
    saleAmount < 0 ||
    typeof sale_date !== "string" ||
    !sale_date.trim()
  ) {
    return res.status(400).json({
      message:
        "Please provide a valid product, quantity, amount, and sale date.",
    });
  }

  // Accept a date in YYYY-MM-DD format
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sale_date);

  if (!dateMatch) {
    return res.status(400).json({
      message: "Sale date must use YYYY-MM-DD format.",
    });
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return res.status(400).json({
      message: "Please enter a valid sale date.",
    });
  }

  // Get a dedicated connection for this transaction
  db.getConnection((connectionErr, connection) => {
    if (connectionErr) {
      console.error("SALE CONNECTION ERROR:", connectionErr);

      return res.status(500).json({
        message: "Could not connect to the database.",
      });
    }

    connection.beginTransaction((transactionErr) => {
      if (transactionErr) {
        console.error("BEGIN SALE TRANSACTION ERROR:", transactionErr);

        connection.release();

        return res.status(500).json({
          message: "Could not start the sale transaction.",
        });
      }

      // Lock the product row while checking stock
      const productSql = `
        SELECT id, name, price, stock
        FROM products
        WHERE id = ?
        FOR UPDATE
      `;

      connection.query(productSql, [productId], (productErr, products) => {
        if (productErr) {
          console.error("CHECK SALE PRODUCT ERROR:", productErr);

          return rollbackSale(connection, res, "Could not check the product.");
        }

        if (products.length === 0) {
          return rollbackSale(connection, res, "Product not found.", 404);
        }

        const product = products[0];
        const currentStock = Number(product.stock);
        const unitPrice = Number(product.price);

        if (!Number.isInteger(currentStock) || currentStock < 0) {
          return rollbackSale(
            connection,
            res,
            "The product has invalid stock information.",
          );
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          return rollbackSale(
            connection,
            res,
            "The product has an invalid price.",
          );
        }

        // Verify stock availability
        if (saleQuantity > currentStock) {
          return rollbackSale(
            connection,
            res,
            `Insufficient stock. Available stock: ${currentStock}.`,
            400,
          );
        }

        // Calculate amount using the real product price
        const calculatedAmount = Number((unitPrice * saleQuantity).toFixed(2));

        // Check that the amount sent by the frontend matches
        if (Math.abs(saleAmount - calculatedAmount) > 0.01) {
          return rollbackSale(
            connection,
            res,
            `Sale amount mismatch. Expected amount: ${calculatedAmount}.`,
            400,
          );
        }

        // Reduce stock only if enough stock remains
        const updateStockSql = `
            UPDATE products
            SET stock = stock - ?
            WHERE id = ? AND stock >= ?
          `;

        connection.query(
          updateStockSql,
          [saleQuantity, productId, saleQuantity],
          (stockErr, stockResult) => {
            if (stockErr) {
              console.error("UPDATE SALE STOCK ERROR:", stockErr);

              return rollbackSale(
                connection,
                res,
                "Could not update product stock.",
              );
            }

            if (stockResult.affectedRows === 0) {
              return rollbackSale(
                connection,
                res,
                "Stock is no longer available. Refresh the products and try again.",
                400,
              );
            }

            // Insert the sale using the database product name
            const insertSaleSql = `
                INSERT INTO sales
                  (product_id, product_name, quantity, amount, sale_date)
                VALUES (?, ?, ?, ?, ?)
              `;

            const formattedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

            connection.query(
              insertSaleSql,
              [
                product.id,
                product.name,
                saleQuantity,
                calculatedAmount,
                formattedDate,
              ],
              (saleErr, saleResult) => {
                if (saleErr) {
                  console.error("INSERT SALE ERROR:", saleErr);

                  return rollbackSale(
                    connection,
                    res,
                    "Could not save the sale. Check the sales table structure.",
                  );
                }

                // Commit the stock update and sale together
                connection.commit((commitErr) => {
                  if (commitErr) {
                    console.error("COMMIT SALE ERROR:", commitErr);

                    return rollbackSale(
                      connection,
                      res,
                      "Could not complete the sale.",
                    );
                  }

                  connection.release();

                  return res.status(201).json({
                    message: "Sale recorded successfully.",
                    sale: {
                      id: saleResult.insertId,
                      product_id: product.id,
                      product_name: product.name,
                      quantity: saleQuantity,
                      amount: calculatedAmount.toFixed(2),
                      sale_date: formattedDate,
                    },
                    remaining_stock: currentStock - saleQuantity,
                  });
                });
              },
            );
          },
        );
      });
    });
  });
});

/* =========================================================
   SERVER
   ========================================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
