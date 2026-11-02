import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-IN");
}

function getDateKey(value) {
  if (!value) return "";

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function downloadSalesCSV(sales) {
  if (!sales.length) return false;

  const headings = ["Sale ID", "Product", "Quantity", "Amount", "Sale Date"];

  const escapeCSV = (value) => {
    let text = String(value ?? "");

    if (/^[\s]*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = sales.map((sale) => [
    sale.id,
    sale.product_name || sale.product || "",
    sale.quantity,
    sale.amount,
    getDateKey(sale.sale_date || sale.date || sale.created_at),
  ]);

  const csv = [
    headings.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "sales-report.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return true;
}

function SummaryCard({ title, value, description, icon }) {
  return (
    <div className="sales-summary-card">
      <div className="sales-summary-top">
        <span>{title}</span>
        <span className="sales-summary-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <h2>{value}</h2>
      <p>{description}</p>
    </div>
  );
}

function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "1",
    date: getDateKey(new Date()),
  });

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [salesResponse, productsResponse] = await Promise.all([
        fetch(`${API_URL}/sales`),
        fetch(`${API_URL}/products`),
      ]);

      if (!salesResponse.ok || !productsResponse.ok) {
        throw new Error(
          "Could not load sales or products. Check that your backend is running.",
        );
      }

      const [salesData, productsData] = await Promise.all([
        salesResponse.json(),
        productsResponse.json(),
      ]);

      if (!Array.isArray(salesData) || !Array.isArray(productsData)) {
        throw new Error("The backend returned an unexpected data format.");
      }

      setSales(salesData);
      setProducts(productsData);
    } catch (err) {
      setError(err.message || "Unable to load sales data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedProduct = products.find(
    (product) => String(product.id) === String(formData.product_id),
  );

  const quantity = Number(formData.quantity);
  const unitPrice = Number(selectedProduct?.price) || 0;

  const calculatedAmount =
    selectedProduct && Number.isInteger(quantity) && quantity > 0
      ? unitPrice * quantity
      : 0;

  const handleProductChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      product_id: event.target.value,
    }));

    setError("");
    setSuccess("");
  };

  const handleQuantityChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      quantity: event.target.value,
    }));

    setError("");
    setSuccess("");
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      quantity: "1",
      date: getDateKey(new Date()),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.product_id || !formData.date) {
      setError("Please select a product and sale date.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (!selectedProduct) {
      setError("Please select a valid product.");
      return;
    }

    const availableStock = Number(selectedProduct.stock);

    if (!Number.isFinite(availableStock) || availableStock < 0) {
      setError("The selected product has invalid stock information.");
      return;
    }

    if (quantity > availableStock) {
      setError(
        `Only ${availableStock} units of ${selectedProduct.name} are available.`,
      );
      return;
    }

    if (!Number.isFinite(calculatedAmount) || calculatedAmount <= 0) {
      setError("The calculated sale amount must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: Number(formData.product_id),
          product_name: selectedProduct.name,
          quantity,
          amount: Number(calculatedAmount.toFixed(2)),
          sale_date: formData.date,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "The backend could not save this sale.",
        );
      }

      setSuccess("Sale recorded successfully!");

      resetForm();
      setShowForm(false);

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save this sale.");
    } finally {
      setSaving(false);
    }
  };

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const productName = sale.product_name || sale.product || "";

      const date = getDateKey(sale.sale_date || sale.date || sale.created_at);

      const matchesSearch = [
        sale.id,
        sale.product_id,
        productName,
        sale.quantity,
        sale.amount,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      );

      const matchesStart = !startDate || date >= startDate;
      const matchesEnd = !endDate || date <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [sales, search, startDate, endDate]);

  const summary = useMemo(() => {
    const revenue = filteredSales.reduce(
      (total, sale) => total + (Number(sale.amount) || 0),
      0,
    );

    const orders = filteredSales.length;

    const items = filteredSales.reduce(
      (total, sale) => total + (Number(sale.quantity) || 0),
      0,
    );

    return {
      revenue,
      orders,
      items,
      average: orders ? revenue / orders : 0,
    };
  }, [filteredSales]);

  const handleExport = () => {
    if (!downloadSalesCSV(filteredSales)) {
      setError("There are no sales records to export.");
      return;
    }

    setSuccess("Sales report exported successfully.");
    setError("");
  };

  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <main className="page sales-page">
      <div className="page-heading sales-heading">
        <div>
          <h1>Sales Management</h1>
          <p>Record transactions and monitor your sales performance.</p>
        </div>

        <div className="sales-heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadData}
            disabled={loading || saving}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowForm((previous) => !previous);
              setError("");
              setSuccess("");
            }}
            disabled={loading || saving}
          >
            {showForm ? "Close Form" : "+ Record Sale"}
          </button>
        </div>
      </div>

      {error && (
        <div className="sales-notice sales-notice-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="sales-notice-close"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="sales-notice sales-notice-success" role="status">
          <span>{success}</span>
          <button
            type="button"
            className="sales-notice-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}

      {showForm && (
        <section className="panel sales-form-panel">
          <div className="panel-header">
            <div>
              <h2>Record a New Sale</h2>
              <p>Select a product and enter the quantity to sell.</p>
            </div>
          </div>

          {products.length === 0 ? (
            <p className="sales-empty-message">
              No products are available. Add a product before recording a sale.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="sales-form-grid">
                <div className="form-group">
                  <label htmlFor="sale-product">Product</label>

                  <select
                    id="sale-product"
                    value={formData.product_id}
                    onChange={handleProductChange}
                    required
                  >
                    <option value="">Select a product</option>

                    {products.map((product) => {
                      const stock = Number(product.stock) || 0;

                      return (
                        <option
                          key={product.id}
                          value={product.id}
                          disabled={stock <= 0}
                        >
                          {product.name} — Stock: {stock}
                          {stock <= 0 ? " (Out of stock)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="sale-quantity">Quantity</label>

                  <input
                    id="sale-quantity"
                    type="number"
                    min="1"
                    max={selectedProduct?.stock}
                    step="1"
                    value={formData.quantity}
                    onChange={handleQuantityChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sale-date">Sale Date</label>

                  <input
                    id="sale-date"
                    type="date"
                    value={formData.date}
                    max={getDateKey(new Date())}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        date: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="sales-calculation">
                  <div>
                    <span>Unit Price</span>
                    <strong>{formatCurrency(unitPrice)}</strong>
                  </div>

                  <div>
                    <span>Available Stock</span>
                    <strong>{selectedProduct.stock} units</strong>
                  </div>

                  <div>
                    <span>Quantity</span>
                    <strong>
                      {Number.isInteger(quantity) && quantity > 0
                        ? quantity
                        : "—"}
                    </strong>
                  </div>

                  <div className="sales-calculation-total">
                    <span>Total Sale Amount</span>
                    <strong>{formatCurrency(calculatedAmount)}</strong>
                  </div>
                </div>
              )}

              <div className="sales-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    resetForm();
                    setError("");
                  }}
                  disabled={saving}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    saving ||
                    loading ||
                    !selectedProduct ||
                    !Number.isInteger(quantity) ||
                    quantity < 1 ||
                    quantity > Number(selectedProduct?.stock)
                  }
                >
                  {saving ? "Saving Sale..." : "Save Sale"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="sales-summary-grid" aria-label="Sales summary">
        <SummaryCard
          title="Total Revenue"
          value={formatCurrency(summary.revenue)}
          description="Revenue from filtered sales"
          icon="₹"
        />

        <SummaryCard
          title="Total Orders"
          value={summary.orders.toLocaleString("en-IN")}
          description="Recorded transactions"
          icon="▤"
        />

        <SummaryCard
          title="Items Sold"
          value={summary.items.toLocaleString("en-IN")}
          description="Units across filtered sales"
          icon="▦"
        />

        <SummaryCard
          title="Average Order"
          value={formatCurrency(summary.average)}
          description="Average revenue per transaction"
          icon="↗"
        />
      </section>

      <section className="panel sales-history-panel">
        <div className="panel-header sales-history-heading">
          <div>
            <h2>Sales History</h2>
            <p>
              {filteredSales.length} of {sales.length} transactions
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleExport}
            disabled={loading || filteredSales.length === 0}
          >
            ↓ Export CSV
          </button>
        </div>

        <div className="sales-filters">
          <div className="sales-search">
            <label htmlFor="sales-search">Search</label>
            <input
              id="sales-search"
              type="search"
              placeholder="Search sale ID or product..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sales-start-date">From Date</label>
            <input
              id="sales-start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sales-end-date">To Date</label>
            <input
              id="sales-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="secondary-button sales-clear-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="sales-loading" role="status">
            Loading sales records...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Sale Amount</th>
                  <th>Sale Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>
                        {typeof sale.id === "number"
                          ? `S${String(sale.id).padStart(3, "0")}`
                          : sale.id}
                      </strong>
                    </td>

                    <td>
                      {sale.product_name ||
                        sale.product ||
                        `Product ${sale.product_id ?? ""}`}
                    </td>

                    <td>{sale.quantity}</td>

                    <td className="sales-amount">
                      {formatCurrency(sale.amount)}
                    </td>

                    <td>
                      {formatDate(
                        sale.sale_date || sale.date || sale.created_at,
                      )}
                    </td>
                  </tr>
                ))}

                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="5" className="sales-no-records">
                      {error
                        ? "Sales data could not be loaded. Try refreshing."
                        : "No sales records match your search or date filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Sales;
