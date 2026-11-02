import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">📦 Inventory</div>

      <div className="logo-subtitle">Management System</div>

      <nav className="sidebar-menu">
        <NavLink to="/" end>
          <span className="menu-icon">📊</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/products">
          <span className="menu-icon">📦</span>
          <span>Products</span>
        </NavLink>

        <NavLink to="/categories">
          <span className="menu-icon">📁</span>
          <span>Categories</span>
        </NavLink>

        <NavLink to="/suppliers">
          <span className="menu-icon">🚚</span>
          <span>Suppliers</span>
        </NavLink>

        <NavLink to="/sales">
          <span className="menu-icon">🛒</span>
          <span>Sales</span>
        </NavLink>

        <NavLink to="/reports">
          <span className="menu-icon">📈</span>
          <span>Reports</span>
        </NavLink>

        <NavLink to="/settings">
          <span className="menu-icon">⚙️</span>
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <p>Inventory System</p>
        <small>Version 1.0</small>
      </div>
    </aside>
  );
}

export default Sidebar;
