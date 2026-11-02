import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/products";

const EMPTY_PRODUCT = {
  name: "",
  category: "",
  price: "",
  stock: "",
};

function Products() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);

  const [lowStockLimit, setLowStockLimit] = useState(() => {
    try {
      const saved = localStorage.getItem("inventoryAppSettings");
      const settings = saved ? JSON.parse(saved) : {};

      const limit = Number(settings.lowStockLimit ?? 10);

      return Number.isInteger(limit) && limit >= 0 ? limit : 10;
    } catch {
      return 10;
    }
  });

  // Load products from the backend.
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load products from the server.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an unexpected product list.");
      }

      setProducts(data);
    } catch (err) {
      console.error("Product loading error:", err);
      setError(
        "Unable to load products. Please check that your backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Read the current low-stock threshold from Settings.
  useEffect(() => {
    function updateLowStockLimit() {
      try {
        const saved = localStorage.getItem("inventoryAppSettings");
        const settings = saved ? JSON.parse(saved) : {};
        const limit = Number(settings.lowStockLimit ?? 10);

        setLowStockLimit(Number.isInteger(limit) && limit >= 0 ? limit : 10);
      } catch {
        setLowStockLimit(10);
      }
    }

    window.addEventListener("storage", updateLowStockLimit);

    return () => {
      window.removeEventListener("storage", updateLowStockLimit);
    };
  }, []);

  // Handle form input changes.
  function handleInputChange(event) {
    const { name, value } = event.target;

    setNewProduct((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  }

  // Open a fresh form.
  function openAddForm() {
    setEditingProduct(null);
    setNewProduct({ ...EMPTY_PRODUCT });
    setMessage("");
    setShowForm(true);
  }

  // Open the edit form.
  function editProduct(product) {
    setEditingProduct(product);

    setNewProduct({
      name: product.name ?? "",
      category: product.category ?? "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
    });

    setMessage("");
    setShowForm(true);
  }

  // Close the form.
  function cancelForm() {
    setShowForm(false);
    setEditingProduct(null);
    setNewProduct({ ...EMPTY_PRODUCT });
    setMessage("");
  }

  // Add or update a product.
  async function saveProduct(event) {
    event.preventDefault();
    setMessage("");

    const name = newProduct.name.trim();
    const category = newProduct.category.trim();
    const price = Number(newProduct.price);
    const stock = Number(newProduct.stock);

    if (!name || !category) {
      setMessage("Please enter both product name and category.");
      return;
    }

    if (newProduct.price === "" || !Number.isFinite(price) || price < 0) {
      setMessage("Please enter a valid, non-negative price.");
      return;
    }

    if (newProduct.stock === "" || !Number.isInteger(stock) || stock < 0) {
      setMessage("Stock must be a non-negative whole number.");
      return;
    }

    const payload = {
      name,
      category,
      price,
      stock,
    };

    const isEditing = Boolean(editingProduct);

    const url = isEditing ? `${API_URL}/${editingProduct.id}` : API_URL;

    try {
      setSubmitting(true);

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Failed to ${isEditing ? "update" : "add"} product.`,
        );
      }

      setMessage(
        isEditing
          ? "Product updated successfully!"
          : "Product added successfully!",
      );

      setShowForm(false);
      setEditingProduct(null);
      setNewProduct({ ...EMPTY_PRODUCT });

      await fetchProducts();
    } catch (err) {
      console.error("Saving product error:", err);
      setMessage(err.message || "Unable to connect to the backend.");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete a product.
  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`,
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete product.");
      }

      setMessage("Product deleted successfully!");
      await fetchProducts();
    } catch (err) {
      console.error("Deleting product error:", err);
      setMessage(err.message || "Unable to connect to the backend.");
    }
  }

  // Search by product name or category.
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.name ?? "").toLowerCase();
      const category = String(product.category ?? "").toLowerCase();

      return name.includes(query) || category.includes(query);
    });
  }, [products, search]);

  // Calculate dashboard figures.
  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + (Number(product.stock) || 0),
    0,
  );

  const lowStockProducts = products.filter(
    (product) => Number(product.stock) <= lowStockLimit,
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total + (Number(product.price) || 0) * (Number(product.stock) || 0),
    0,
  );

  return (
    <main className="page">
      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <h1>Products</h1>
          <p>Manage and monitor your inventory products.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="primary-button"
            onClick={fetchProducts}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openAddForm}
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* SUCCESS AND ERROR MESSAGES */}
      {message && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            marginBottom: "18px",
            borderRadius: "8px",
            background: message.includes("successfully")
              ? "#dcfce7"
              : "#fee2e2",
            color: message.includes("successfully") ? "#166534" : "#991b1b",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: "14px",
            marginBottom: "18px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
          <button
            type="button"
            onClick={fetchProducts}
            style={{ marginLeft: "12px", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div
        className="product-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        <div className="panel">
          <p
            style={{
              margin: "0 0 10px",
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            📦 Total Products
          </p>
          <h2 style={{ margin: 0 }}>{totalProducts}</h2>
        </div>

        <div className="panel">
          <p
            style={{
              margin: "0 0 10px",
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            🏷️ Total Stock Units
          </p>
          <h2 style={{ margin: 0 }}>{totalStock.toLocaleString()}</h2>
        </div>

        <div className="panel">
          <p
            style={{
              margin: "0 0 10px",
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            ⚠️ Low-Stock Products
          </p>
          <h2 style={{ margin: 0, color: "#dc2626" }}>
            {lowStockProducts.length}
          </h2>
          <small>Stock at or below {lowStockLimit}</small>
        </div>

        <div className="panel">
          <p
            style={{
              margin: "0 0 10px",
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            💰 Inventory Value
          </p>
          <h2 style={{ margin: 0 }}>
            ₹
            {inventoryValue.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </h2>
          <small>Price × current stock</small>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="panel form-panel" style={{ marginBottom: "24px" }}>
          <h2>{editingProduct ? "✏️ Edit Product" : "➕ Add New Product"}</h2>

          <form className="product-form" onSubmit={saveProduct}>
            <div className="form-group">
              <label htmlFor="product-name">Product Name</label>
              <input
                id="product-name"
                name="name"
                value={newProduct.name}
                onChange={handleInputChange}
                placeholder="Enter product name"
                maxLength={150}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-category">Category</label>
              <input
                id="product-category"
                name="category"
                value={newProduct.category}
                onChange={handleInputChange}
                placeholder="Enter category"
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-price">Price (₹)</label>
              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-stock">Stock Quantity</label>
              <input
                id="product-stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                value={newProduct.stock}
                onChange={handleInputChange}
                placeholder="Enter stock quantity"
                required
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "10px",
              }}
            >
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : editingProduct
                    ? "Update Product"
                    : "Save Product"}
              </button>

              <button
                type="button"
                className="delete-button"
                onClick={cancelForm}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SEARCH */}
      <div className="search-panel" style={{ marginBottom: "20px" }}>
        <input
          type="search"
          placeholder="🔍 Search by product name or category..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search products"
        />
      </div>

      {/* PRODUCT TABLE */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Product List</h2>
            <p>
              Showing {filteredProducts.length} of {totalProducts} products
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "30px" }}
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const stock = Number(product.stock) || 0;
                  const isLowStock = stock <= lowStockLimit;

                  return (
                    <tr key={product.id}>
                      <td>#{product.id}</td>

                      <td>
                        <strong>{product.name}</strong>
                      </td>

                      <td>{product.category}</td>

                      <td>
                        ₹
                        {Number(product.price).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td>{stock.toLocaleString("en-IN")}</td>

                      <td>
                        <span
                          className={isLowStock ? "status low" : "status good"}
                        >
                          {isLowStock ? "Low Stock" : "In Stock"}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => editProduct(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit product"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => deleteProduct(product)}
                            aria-label={`Delete ${product.name}`}
                            title="Delete product"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "30px" }}
                  >
                    {search
                      ? "No products match your search."
                      : "No products found. Click Add Product to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Products;
