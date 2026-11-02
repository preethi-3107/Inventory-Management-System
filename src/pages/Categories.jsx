import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [editingCategory, setEditingCategory] = useState(null);
  const [openedCategory, setOpenedCategory] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // FETCH CATEGORIES
  const fetchCategories = useCallback(async () => {
    const response = await fetch(`${API_URL}/categories`);

    if (!response.ok) {
      throw new Error("Unable to load categories.");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected categories response from backend.");
    }

    setCategories(data);
  }, []);

  // FETCH PRODUCTS
  const fetchProducts = useCallback(async () => {
    const response = await fetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Unable to load products.");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected products response from backend.");
    }

    setProducts(data);
  }, []);

  // LOAD PAGE DATA
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([fetchCategories(), fetchProducts()]);
    } catch (err) {
      setError(err.message || "Unable to load category data.");
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // COUNT PRODUCTS IN A CATEGORY
  const getProductCount = useCallback(
    (categoryName) => {
      return products.filter(
        (product) =>
          String(product.category || "")
            .trim()
            .toLowerCase() ===
          String(categoryName || "")
            .trim()
            .toLowerCase(),
      ).length;
    },
    [products],
  );

  // TOTAL INVENTORY SUMMARY
  const totalStock = useMemo(
    () =>
      products.reduce(
        (total, product) => total + (Number(product.stock) || 0),
        0,
      ),
    [products],
  );

  const categoriesInUse = useMemo(
    () =>
      categories.filter((category) => getProductCount(category.name) > 0)
        .length,
    [categories, getProductCount],
  );

  // SEARCH CATEGORIES
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) =>
      String(category.name || "")
        .toLowerCase()
        .includes(query),
    );
  }, [categories, search]);

  // SORT CATEGORIES
  const sortedCategories = useMemo(() => {
    const result = [...filteredCategories];

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = String(a.name || "").localeCompare(String(b.name || ""));
      } else if (sortBy === "products") {
        comparison = getProductCount(a.name) - getProductCount(b.name);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [filteredCategories, sortBy, sortOrder, getProductCount]);

  // RESET PAGINATION WHEN FILTERS CHANGE
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, sortOrder, itemsPerPage]);

  // PAGINATION
  const totalPages = Math.max(
    1,
    Math.ceil(sortedCategories.length / itemsPerPage),
  );

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedCategories = sortedCategories.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // PRODUCTS INSIDE OPEN CATEGORY
  const categoryProducts = openedCategory
    ? products.filter(
        (product) =>
          String(product.category || "")
            .trim()
            .toLowerCase() ===
          String(openedCategory.name || "")
            .trim()
            .toLowerCase(),
      )
    : [];

  // ADD OR UPDATE CATEGORY
  async function saveCategory(event) {
    event.preventDefault();

    const categoryName = name.trim();

    if (!categoryName) {
      setError("Please enter a category name.");
      setMessage("");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        String(category.name || "")
          .trim()
          .toLowerCase() === categoryName.toLowerCase() &&
        category.id !== editingCategory?.id,
    );

    if (duplicate) {
      setError("This category already exists.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = Boolean(editingCategory);

      const response = await fetch(
        isEditing
          ? `${API_URL}/categories/${editingCategory.id}`
          : `${API_URL}/categories`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: categoryName,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Failed to ${isEditing ? "update" : "add"} category.`,
        );
      }

      setName("");
      setEditingCategory(null);

      await fetchCategories();

      setMessage(
        isEditing
          ? "Category updated successfully."
          : "Category added successfully.",
      );
    } catch (err) {
      setError(err.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  // EDIT CATEGORY
  function editCategory(category) {
    setEditingCategory(category);
    setName(category.name || "");
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // CANCEL EDIT
  function cancelEdit() {
    setEditingCategory(null);
    setName("");
    setError("");
    setMessage("");
  }

  // DELETE CATEGORY
  async function deleteCategory(category) {
    const count = getProductCount(category.name);

    if (count > 0) {
      setError(
        `Cannot delete "${category.name}" because ${count} product(s) belong to it. Move or remove those products first.`,
      );
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/categories/${category.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete category.");
      }

      if (editingCategory?.id === category.id) {
        setEditingCategory(null);
        setName("");
      }

      if (openedCategory?.id === category.id) {
        setOpenedCategory(null);
      }

      await fetchCategories();

      setMessage("Category deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete category.");
    } finally {
      setDeletingId(null);
    }
  }

  // REFRESH DATA
  async function handleRefresh() {
    setMessage("");
    await loadData();
  }

  // CATEGORY DETAILS VIEW
  if (openedCategory) {
    return (
      <main className="page">
        <div className="page-heading">
          <div>
            <h1>📁 {openedCategory.name}</h1>
            <p>{categoryProducts.length} product(s) in this category</p>
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setOpenedCategory(null);
              setError("");
              setMessage("");
            }}
          >
            ← Back to Categories
          </button>
        </div>

        {error && <div className="category-alert error">{error}</div>}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Category Products</h2>
              <p>Products assigned to {openedCategory.name}</p>
            </div>
          </div>

          {loading ? (
            <p className="category-empty">Loading products...</p>
          ) : categoryProducts.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Available Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {categoryProducts.map((product) => {
                    const stock = Number(product.stock) || 0;

                    return (
                      <tr key={product.id}>
                        <td>#{product.id}</td>
                        <td>
                          <strong>{product.name}</strong>
                        </td>
                        <td>
                          ₹
                          {(Number(product.price) || 0).toLocaleString("en-IN")}
                        </td>
                        <td>{stock}</td>
                        <td>
                          <span
                            className={`status ${stock <= 10 ? "low" : "good"}`}
                          >
                            {stock <= 10 ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="category-empty">
              No products are assigned to this category.
            </p>
          )}
        </section>
      </main>
    );
  }

  // MAIN CATEGORIES PAGE
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <h1>📁 Categories</h1>
          <p>Organize and manage your inventory categories.</p>
        </div>

        <button
          className="primary-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="category-summary">
        <div className="category-summary-card">
          <span className="category-summary-icon">📁</span>
          <div>
            <p>Total Categories</p>
            <h2>{categories.length}</h2>
          </div>
        </div>

        <div className="category-summary-card">
          <span className="category-summary-icon">📦</span>
          <div>
            <p>Total Products</p>
            <h2>{products.length}</h2>
          </div>
        </div>

        <div className="category-summary-card">
          <span className="category-summary-icon">🗂️</span>
          <div>
            <p>Categories in Use</p>
            <h2>{categoriesInUse}</h2>
          </div>
        </div>

        <div className="category-summary-card">
          <span className="category-summary-icon">📊</span>
          <div>
            <p>Total Stock Units</p>
            <h2>{totalStock.toLocaleString("en-IN")}</h2>
          </div>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      <section className="panel category-form-panel">
        <div className="panel-header">
          <div>
            <h2>
              {editingCategory ? "✏️ Edit Category" : "➕ Add New Category"}
            </h2>
            <p>
              {editingCategory
                ? "Update the selected category name."
                : "Create a category to organize your products."}
            </p>
          </div>
        </div>

        <form className="category-add" onSubmit={saveCategory}>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
              setMessage("");
            }}
            placeholder="Enter category name"
            maxLength={100}
            aria-label="Category name"
            disabled={saving}
          />

          <button className="primary-button" type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingCategory
                ? "Save Changes"
                : "+ Add Category"}
          </button>

          {editingCategory && (
            <button
              className="delete-button"
              type="button"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </form>

        {error && <div className="category-alert error">{error}</div>}
        {message && <div className="category-alert success">{message}</div>}
      </section>

      {/* CATEGORY LIST */}
      <section className="panel">
        <div className="panel-header category-list-header">
          <div>
            <h2>All Categories</h2>
            <p>Search, sort, and open categories to view their products.</p>
          </div>

          <div className="category-controls">
            <input
              className="category-search"
              type="search"
              placeholder="🔍 Search categories..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search categories"
            />

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort categories by"
            >
              <option value="name">Sort by Name</option>
              <option value="products">Sort by Product Count</option>
            </select>

            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(event) => setItemsPerPage(Number(event.target.value))}
              aria-label="Categories per page"
            >
              <option value={6}>6 per page</option>
              <option value={9}>9 per page</option>
              <option value={12}>12 per page</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="category-empty">Loading categories...</p>
        ) : paginatedCategories.length > 0 ? (
          <>
            <div className="category-grid">
              {paginatedCategories.map((category) => {
                const count = getProductCount(category.name);

                return (
                  <article className="category-card" key={category.id}>
                    <button
                      type="button"
                      className="category-card-main"
                      onClick={() => setOpenedCategory(category)}
                      aria-label={`View products in ${category.name}`}
                    >
                      <span className="category-icon">📁</span>
                      <h3>{category.name}</h3>
                      <p>
                        {count} {count === 1 ? "product" : "products"}
                      </p>
                      <span className="category-view-link">
                        View products →
                      </span>
                    </button>

                    <div className="category-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => editCategory(category)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteCategory(category)}
                        disabled={count > 0 || deletingId === category.id}
                        title={
                          count > 0
                            ? "Move or remove products before deleting this category."
                            : "Delete category"
                        }
                      >
                        {deletingId === category.id
                          ? "Deleting..."
                          : "🗑️ Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* PAGINATION */}
            <div className="category-pagination">
              <p>
                Showing {startIndex + 1}–
                {Math.min(startIndex + itemsPerPage, sortedCategories.length)}{" "}
                of {sortedCategories.length} categories
              </p>

              <div className="category-pagination-buttons">
                <button
                  type="button"
                  className="primary-button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                >
                  ← Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="primary-button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="category-empty">
            {search
              ? "No categories match your search."
              : "No categories found. Add your first category above."}
          </p>
        )}
      </section>
    </main>
  );
}

export default Categories;
