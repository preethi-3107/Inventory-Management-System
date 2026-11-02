import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getLocalDate(value) {
  if (!value) return "";

  // Date-only strings should not shift to another day due to timezone.
  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return raw.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const dateKey = getLocalDate(value);

  if (!dateKey) return "—";

  const date = new Date(`${dateKey}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString("en-IN");
}

function downloadCSV(filename, rows) {
  if (!rows.length) {
    window.alert("There is no data to export.");
    return;
  }

  const columns = Object.keys(rows[0]);

  // Protect spreadsheet users from formula injection.
  const escapeCSV = (value) => {
    let text = String(value ?? "");

    if (/^[\s]*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    columns.map(escapeCSV).join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCSV(row[column])).join(","),
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SummaryCard({ icon, label, value, description, color }) {
  return (
    <article className="report-stat-card">
      <div className={`report-stat-icon ${color || ""}`} aria-hidden="true">
        {icon}
      </div>

      <div className="report-stat-content">
        <p>{label}</p>
        <h2>{value}</h2>
        <span>{description}</span>
      </div>
    </article>
  );
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState("inventory");

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // LOAD DATA FROM BACKEND
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoints = [
        `${API_URL}/products`,
        `${API_URL}/sales`,
        `${API_URL}/suppliers`,
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) => fetch(endpoint)),
      );

      const failedResponse = responses.find((response) => !response.ok);

      if (failedResponse) {
        throw new Error(
          "Unable to load report data. Check your backend API endpoints.",
        );
      }

      const [productsData, salesData, suppliersData] = await Promise.all(
        responses.map((response) => response.json()),
      );

      if (
        !Array.isArray(productsData) ||
        !Array.isArray(salesData) ||
        !Array.isArray(suppliersData)
      ) {
        throw new Error("The backend returned an unexpected data format.");
      }

      setProducts(productsData);
      setSales(salesData);
      setSuppliers(suppliersData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Reports loading error:", err);

      setError(
        err.message ||
          "Could not load reports. Check that the backend and database are running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // SEARCH PRODUCTS
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) =>
      [
        product.id,
        product.name,
        product.category,
        product.price,
        product.stock,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [products, search]);

  // SEARCH AND FILTER SALES
  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const saleDate = getLocalDate(sale.sale_date || sale.created_at);

      const matchesSearch = [
        sale.id,
        sale.product_id,
        sale.product_name,
        sale.quantity,
        sale.amount,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      );

      const matchesStart = !startDate || saleDate >= startDate;
      const matchesEnd = !endDate || saleDate <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [sales, search, startDate, endDate]);

  // SEARCH SUPPLIERS
  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return suppliers.filter((supplier) =>
      [supplier.id, supplier.name, supplier.contact, supplier.email].some(
        (value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term),
      ),
    );
  }, [suppliers, search]);

  // INVENTORY CALCULATIONS
  const totalStock = products.reduce(
    (total, product) => total + (Number(product.stock) || 0),
    0,
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total + (Number(product.price) || 0) * (Number(product.stock) || 0),
    0,
  );

  const lowStockLimit = (() => {
    const savedSettings = localStorage.getItem("inventoryAppSettings");

    if (!savedSettings) return 10;

    try {
      const settings = JSON.parse(savedSettings);
      const limit = Number(settings.lowStockLimit);

      return Number.isFinite(limit) && limit >= 0 ? limit : 10;
    } catch {
      return 10;
    }
  })();

  const lowStockProducts = products.filter(
    (product) => Number(product.stock) <= lowStockLimit,
  );

  // SALES CALCULATIONS
  const totalRevenue = filteredSales.reduce(
    (total, sale) => total + (Number(sale.amount) || 0),
    0,
  );

  const totalItemsSold = filteredSales.reduce(
    (total, sale) => total + (Number(sale.quantity) || 0),
    0,
  );

  const averageSale = filteredSales.length
    ? totalRevenue / filteredSales.length
    : 0;

  // RESET FILTERS
  function clearFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
  }

  // CHANGE REPORT TAB
  function changeReport(reportId) {
    setSelectedReport(reportId);
    clearFilters();
  }

  // EXPORT THE SELECTED REPORT
  function exportCurrentReport() {
    if (selectedReport === "inventory") {
      downloadCSV(
        "inventory-report.csv",
        filteredProducts.map((product) => ({
          ID: product.id,
          Product: product.name,
          Category: product.category,
          Price: Number(product.price) || 0,
          Stock: Number(product.stock) || 0,
          InventoryValue:
            (Number(product.price) || 0) * (Number(product.stock) || 0),
          Status:
            Number(product.stock) <= lowStockLimit ? "Low Stock" : "In Stock",
        })),
      );
    } else if (selectedReport === "sales") {
      downloadCSV(
        "sales-report.csv",
        filteredSales.map((sale) => ({
          SaleID: sale.id,
          ProductID: sale.product_id,
          Product: sale.product_name || `Product ${sale.product_id ?? ""}`,
          Quantity: Number(sale.quantity) || 0,
          Amount: Number(sale.amount) || 0,
          Date: getLocalDate(sale.sale_date || sale.created_at),
        })),
      );
    } else {
      downloadCSV(
        "supplier-report.csv",
        filteredSuppliers.map((supplier) => ({
          ID: supplier.id,
          Name: supplier.name,
          Contact: supplier.contact,
          Email: supplier.email,
        })),
      );
    }
  }

  const activeRows =
    selectedReport === "inventory"
      ? filteredProducts
      : selectedReport === "sales"
        ? filteredSales
        : filteredSuppliers;

  return (
    <main className="page reports-page">
      {/* HEADER */}
      <header className="page-heading reports-heading">
        <div>
          <h1>Reports & Analytics</h1>

          <p>
            Monitor your inventory, sales performance, and supplier records.
          </p>

          {lastUpdated && (
            <small className="report-updated">
              Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
            </small>
          )}
        </div>

        <div className="report-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadReports}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => window.print()}
            disabled={loading || Boolean(error)}
          >
            ⎙ Print Report
          </button>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="report-message report-error" role="alert">
          <div>
            <strong>Unable to load reports</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={loadReports}
          >
            Try Again
          </button>
        </div>
      )}

      {/* REPORT TABS */}
      <nav className="report-tabs" aria-label="Report categories">
        {[
          { id: "inventory", icon: "📦", label: "Inventory Report" },
          { id: "sales", icon: "📈", label: "Sales Report" },
          { id: "suppliers", icon: "👥", label: "Supplier Report" },
        ].map((report) => (
          <button
            type="button"
            key={report.id}
            className={
              selectedReport === report.id ? "report-tab active" : "report-tab"
            }
            onClick={() => changeReport(report.id)}
            aria-pressed={selectedReport === report.id}
          >
            <span aria-hidden="true">{report.icon}</span>
            {report.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <section className="panel report-loading">
          <div className="report-spinner" />
          <p>Loading reports from your database...</p>
        </section>
      ) : !error ? (
        <>
          {/* INVENTORY REPORT */}
          {selectedReport === "inventory" && (
            <>
              <section className="report-stat-grid">
                <SummaryCard
                  icon="📦"
                  label="Total Products"
                  value={products.length}
                  description="Registered products"
                  color="purple"
                />

                <SummaryCard
                  icon="🔢"
                  label="Total Stock"
                  value={totalStock.toLocaleString("en-IN")}
                  description="Units currently available"
                  color="blue"
                />

                <SummaryCard
                  icon="₹"
                  label="Inventory Value"
                  value={formatCurrency(inventoryValue)}
                  description="Price multiplied by stock"
                  color="green"
                />

                <SummaryCard
                  icon="⚠"
                  label="Low Stock Items"
                  value={lowStockProducts.length}
                  description={`Stock at or below ${lowStockLimit} units`}
                  color="orange"
                />
              </section>

              {lowStockProducts.length > 0 && (
                <section className="report-low-stock">
                  <div className="report-warning-icon">!</div>

                  <div>
                    <strong>Low stock alert</strong>

                    <p>
                      {lowStockProducts.length} product(s) have stock at or
                      below your configured limit.
                    </p>

                    <div className="report-low-stock-list">
                      {lowStockProducts.map((product) => (
                        <span key={product.id}>
                          {product.name}: {product.stock} units
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {/* SALES REPORT */}
          {selectedReport === "sales" && (
            <section className="report-stat-grid">
              <SummaryCard
                icon="₹"
                label="Total Revenue"
                value={formatCurrency(totalRevenue)}
                description="Revenue from filtered sales records"
                color="green"
              />

              <SummaryCard
                icon="🧾"
                label="Sales Records"
                value={filteredSales.length}
                description="Matching transactions"
                color="purple"
              />

              <SummaryCard
                icon="📦"
                label="Items Sold"
                value={totalItemsSold.toLocaleString("en-IN")}
                description="Quantity across filtered records"
                color="blue"
              />

              <SummaryCard
                icon="📊"
                label="Average Sale"
                value={formatCurrency(averageSale)}
                description="Revenue divided by sale records"
                color="orange"
              />
            </section>
          )}

          {/* SUPPLIER REPORT */}
          {selectedReport === "suppliers" && (
            <section className="report-stat-grid">
              <SummaryCard
                icon="👥"
                label="Total Suppliers"
                value={suppliers.length}
                description="Registered suppliers"
                color="purple"
              />

              <SummaryCard
                icon="✉"
                label="Email Records"
                value={
                  suppliers.filter((supplier) => supplier.email?.trim()).length
                }
                description="Suppliers with email addresses"
                color="blue"
              />

              <SummaryCard
                icon="☎"
                label="Contact Records"
                value={
                  suppliers.filter((supplier) => supplier.contact?.trim())
                    .length
                }
                description="Suppliers with contact numbers"
                color="green"
              />
            </section>
          )}

          {/* REPORT TABLE */}
          <section className="panel report-table-panel">
            <div className="report-table-heading">
              <div>
                <h2>
                  {selectedReport === "inventory"
                    ? "Inventory Details"
                    : selectedReport === "sales"
                      ? "Sales Details"
                      : "Supplier Directory"}
                </h2>

                <p>{activeRows.length} record(s) displayed</p>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={exportCurrentReport}
              >
                ↓ Export CSV
              </button>
            </div>

            {/* FILTERS */}
            <div className="report-filters">
              <div className="report-search">
                <span aria-hidden="true">⌕</span>

                <input
                  type="search"
                  placeholder={
                    selectedReport === "inventory"
                      ? "Search products or categories..."
                      : selectedReport === "sales"
                        ? "Search sales or products..."
                        : "Search suppliers or contacts..."
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search report"
                />
              </div>

              {selectedReport === "sales" && (
                <>
                  <label className="report-date-filter">
                    <span>From</span>

                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>

                  <label className="report-date-filter">
                    <span>To</span>

                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </label>
                </>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>

            <div className="table-wrapper">
              <table className="report-table">
                <thead>
                  {selectedReport === "inventory" && (
                    <tr>
                      {[
                        "ID",
                        "Product",
                        "Category",
                        "Price",
                        "Stock",
                        "Inventory Value",
                        "Status",
                      ].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  )}

                  {selectedReport === "sales" && (
                    <tr>
                      {[
                        "Sale ID",
                        "Product",
                        "Quantity",
                        "Amount",
                        "Sale Date",
                      ].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  )}

                  {selectedReport === "suppliers" && (
                    <tr>
                      {["ID", "Supplier Name", "Contact", "Email"].map(
                        (heading) => (
                          <th key={heading}>{heading}</th>
                        ),
                      )}
                    </tr>
                  )}
                </thead>

                <tbody>
                  {selectedReport === "inventory" &&
                    filteredProducts.map((product) => {
                      const isLowStock = Number(product.stock) <= lowStockLimit;

                      return (
                        <tr key={product.id}>
                          <td>#{product.id}</td>
                          <td>
                            <strong>{product.name}</strong>
                          </td>
                          <td>{product.category || "—"}</td>
                          <td>{formatCurrency(product.price)}</td>
                          <td>{product.stock}</td>
                          <td>
                            {formatCurrency(
                              (Number(product.price) || 0) *
                                (Number(product.stock) || 0),
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                isLowStock
                                  ? "report-status low"
                                  : "report-status good"
                              }
                            >
                              {isLowStock ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {selectedReport === "sales" &&
                    filteredSales.map((sale) => (
                      <tr key={sale.id}>
                        <td>#{sale.id}</td>
                        <td>
                          {sale.product_name ||
                            `Product ${sale.product_id ?? ""}`}
                        </td>
                        <td>{sale.quantity}</td>
                        <td>{formatCurrency(sale.amount)}</td>
                        <td>{formatDate(sale.sale_date || sale.created_at)}</td>
                      </tr>
                    ))}

                  {selectedReport === "suppliers" &&
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>#{supplier.id}</td>
                        <td>
                          <strong>{supplier.name}</strong>
                        </td>
                        <td>{supplier.contact || "—"}</td>
                        <td>{supplier.email || "—"}</td>
                      </tr>
                    ))}

                  {activeRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          selectedReport === "inventory"
                            ? 7
                            : selectedReport === "sales"
                              ? 5
                              : 4
                        }
                        className="report-empty"
                      >
                        <span>📂</span>
                        <strong>No records found</strong>
                        <p>Try changing your search or filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="report-table-footer">
              Showing {activeRows.length} record(s)
            </footer>
          </section>
        </>
      ) : null}
    </main>
  );
}
