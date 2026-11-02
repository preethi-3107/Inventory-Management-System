function Header() {
  return (
    <header className="header">
      <div>
        <h2>Inventory Management System</h2>
        <p>Manage your inventory efficiently</p>
      </div>

      <div className="admin-profile">
        <div className="admin-icon">👤</div>

        <div>
          <strong>Admin</strong>
          <small>Administrator</small>
        </div>
      </div>
    </header>
  );
}

export default Header;
