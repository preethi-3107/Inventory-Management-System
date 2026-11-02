import { useEffect, useState } from "react";

function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // GET PRODUCTS AND SALES FROM BACKEND
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [productsResponse, salesResponse] = await Promise.all([
          fetch("http://localhost:5000/api/products"),
          fetch("http://localhost:5000/api/sales"),
        ]);

        if (!productsResponse.ok || !salesResponse.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const productsData = await productsResponse.json();
        const salesData = await salesResponse.json();

        setProducts(productsData);
        setSales(salesData);
      } catch (error) {
        console.error("Dashboard error:", error);
        setError("Unable to load data. Please check your backend.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // CALCULATE DASHBOARD VALUES
  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0,
  );

  const lowStockProducts = products.filter(
    (product) => Number(product.stock || 0) <= 10,
  );

  const inStockProducts = products.filter(
    (product) => Number(product.stock || 0) > 10,
  );

  const totalSales = sales.reduce(
    (total, sale) => total + Number(sale.amount || 0),
    0,
  );

  const recentProducts = [...products].reverse().slice(0, 5);

  const inStockPercentage =
    totalProducts > 0 ? (inStockProducts.length / totalProducts) * 100 : 0;

  const lowStockPercentage =
    totalProducts > 0 ? (lowStockProducts.length / totalProducts) * 100 : 0;

  // LOADING MESSAGE
  if (loading) {
    return (
      <main className="page">
        <h1>Dashboard</h1>
        <p>Loading dashboard data...</p>
      </main>
    );
  }

  return (
    <main className="page">
      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your inventory</p>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="panel">
          <p>{error}</p>
          <button
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="dashboard-card-icon blue">📦</div>
          <div>
            <span>Total Products</span>
            <h2>{totalProducts}</h2>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon green">📊</div>
          <div>
            <span>Total Stock</span>
            <h2>{totalStock.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon orange">⚠️</div>
          <div>
            <span>Low Stock</span>
            <h2>{lowStockProducts.length}</h2>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon purple">💰</div>
          <div>
            <span>Total Sales</span>
            <h2>₹{totalSales.toLocaleString("en-IN")}</h2>
          </div>
        </div>
      </div>

      {/* INVENTORY OVERVIEW AND SALES SUMMARY */}
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Inventory Overview</h2>
              <p>Current inventory status</p>
            </div>
          </div>

          <div className="overview-list">
            <div className="overview-item">
              <span>In Stock</span>
              <strong>{inStockProducts.length}</strong>
            </div>

            <div className="overview-bar">
              <div
                className="bar-green"
                style={{ width: `${inStockPercentage}%` }}
              ></div>
            </div>

            <div className="overview-item">
              <span>Low Stock</span>
              <strong>{lowStockProducts.length}</strong>
            </div>

            <div className="overview-bar">
              <div
                className="bar-orange"
                style={{ width: `${lowStockPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Sales Summary</h2>
              <p>Recorded sales</p>
            </div>
          </div>

          <div className="sales-summary">
            <h1>₹{totalSales.toLocaleString("en-IN")}</h1>

            <p>{sales.length} recorded sales</p>

            <div className="fake-chart">
              {Array.from({ length: 7 }, (_, index) => {
                const recentSales = sales.slice(-7);
                const amount = Number(recentSales[index]?.amount || 0);
                const maxAmount = Math.max(
                  ...recentSales.map((sale) => Number(sale.amount || 0)),
                  1,
                );

                return (
                  <div
                    key={index}
                    style={{
                      height: `${Math.max((amount / maxAmount) * 100, 5)}%`,
                    }}
                  ></div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PRODUCTS TABLE */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Products</h2>
            <p>Products from your database</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {recentProducts.length > 0 ? (
                recentProducts.map((product) => (
                  <tr key={product.id}>
                    <td>#{product.id}</td>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.category}</td>
                    <td>{Number(product.stock || 0)}</td>
                    <td>
                      ₹{Number(product.price || 0).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span
                        className={
                          Number(product.stock || 0) <= 10
                            ? "status low"
                            : "status good"
                        }
                      >
                        {Number(product.stock || 0) <= 10
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{ textAlign: "center", padding: "30px" }}
                  >
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
