import { useEffect, useState } from "react";

const DEFAULT_SETTINGS = {
  appName: "Inventory Management System",
  companyName: "My Company",
  adminName: "Administrator",
  email: "",
  notifications: true,
  lowStockAlerts: true,
  emailNotifications: false,
  theme: "light",
  lowStockLimit: 10,
};

function Settings({ onThemeChange }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("inventoryAppSettings");

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);

        const loadedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
        };

        setSettings(loadedSettings);

        if (onThemeChange) {
          onThemeChange(loadedSettings.theme);
        }
      }
    } catch {
      setMessage("Unable to load saved settings.");
      setMessageType("error");
    }
  }, [onThemeChange]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const newValue = type === "checkbox" ? checked : value;

    setSettings((previous) => ({
      ...previous,
      [name]: newValue,
    }));

    if (name === "theme" && onThemeChange) {
      onThemeChange(newValue);
    }

    setMessage("");
  }

  function saveSettings(event) {
    event.preventDefault();

    const stockLimit = Number(settings.lowStockLimit);

    if (!Number.isInteger(stockLimit) || stockLimit < 0) {
      setMessage("Please enter a valid low-stock limit.");
      setMessageType("error");
      return;
    }

    if (!settings.appName.trim() || !settings.companyName.trim()) {
      setMessage("Application name and company name are required.");
      setMessageType("error");
      return;
    }

    try {
      const updatedSettings = {
        ...settings,
        appName: settings.appName.trim(),
        companyName: settings.companyName.trim(),
        adminName: settings.adminName.trim(),
        email: settings.email.trim(),
        lowStockLimit: stockLimit,
      };

      localStorage.setItem(
        "inventoryAppSettings",
        JSON.stringify(updatedSettings),
      );

      setSettings(updatedSettings);

      if (onThemeChange) {
        onThemeChange(updatedSettings.theme);
      }

      setMessage("Settings saved successfully!");
      setMessageType("success");
    } catch {
      setMessage("Unable to save settings in your browser.");
      setMessageType("error");
    }
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Are you sure you want to reset all settings to their default values?",
    );

    if (!confirmed) return;

    try {
      localStorage.setItem(
        "inventoryAppSettings",
        JSON.stringify(DEFAULT_SETTINGS),
      );

      setSettings(DEFAULT_SETTINGS);

      if (onThemeChange) {
        onThemeChange(DEFAULT_SETTINGS.theme);
      }

      setMessage("Settings reset successfully!");
      setMessageType("success");
    } catch {
      setMessage("Unable to reset settings.");
      setMessageType("error");
    }
  }

  const isDark = settings.theme === "dark";

  const pageStyle = {
    minHeight: "100vh",
    padding: "25px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    background: isDark ? "#111827" : "#f8fafc",
    color: isDark ? "#f9fafb" : "#1f2937",
    transition: "background 0.2s ease, color 0.2s ease",
  };

  const cardStyle = {
    background: isDark ? "#1f2937" : "#ffffff",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    boxSizing: "border-box",
    border: `1px solid ${isDark ? "#4b5563" : "#d1d5db"}`,
    borderRadius: "8px",
    fontSize: "14px",
    background: isDark ? "#111827" : "#ffffff",
    color: isDark ? "#ffffff" : "#1f2937",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
  };

  const fieldStyle = {
    marginBottom: "20px",
  };

  const buttonStyle = {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#4f46e5",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
  };

  return (
    <main style={pageStyle}>
      <header style={{ marginBottom: "25px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Settings</h1>

        <p style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>
          Manage your inventory application preferences and account details.
        </p>
      </header>

      {message && (
        <div
          role="status"
          style={{
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "8px",
            background: messageType === "success" ? "#dcfce7" : "#fee2e2",
            color: messageType === "success" ? "#166534" : "#991b1b",
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={saveSettings}>
        {/* GENERAL SETTINGS */}
        <section style={cardStyle}>
          <h2>⚙️ General Settings</h2>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="appName">
              Application Name
            </label>

            <input
              id="appName"
              name="appName"
              style={inputStyle}
              value={settings.appName}
              onChange={handleChange}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="companyName">
              Company Name
            </label>

            <input
              id="companyName"
              name="companyName"
              style={inputStyle}
              value={settings.companyName}
              onChange={handleChange}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="lowStockLimit">
              Low-Stock Alert Limit
            </label>

            <input
              id="lowStockLimit"
              name="lowStockLimit"
              type="number"
              min="0"
              step="1"
              style={inputStyle}
              value={settings.lowStockLimit}
              onChange={handleChange}
              required
            />

            <small style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>
              Products at or below this stock quantity are considered low-stock.
            </small>
          </div>
        </section>

        {/* PROFILE SETTINGS */}
        <section style={cardStyle}>
          <h2>👤 Profile Settings</h2>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="adminName">
              Administrator Name
            </label>

            <input
              id="adminName"
              name="adminName"
              style={inputStyle}
              value={settings.adminName}
              onChange={handleChange}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              style={inputStyle}
              placeholder="admin@example.com"
              value={settings.email}
              onChange={handleChange}
            />
          </div>

          <small style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>
            These details are preferences only; they do not change login
            credentials.
          </small>
        </section>

        {/* NOTIFICATION SETTINGS */}
        <section style={cardStyle}>
          <h2>🔔 Notification Settings</h2>

          <div style={fieldStyle}>
            <label>
              <input
                type="checkbox"
                name="notifications"
                checked={settings.notifications}
                onChange={handleChange}
              />{" "}
              Enable Notifications
            </label>
          </div>

          <div style={fieldStyle}>
            <label>
              <input
                type="checkbox"
                name="lowStockAlerts"
                checked={settings.lowStockAlerts}
                onChange={handleChange}
              />{" "}
              Enable Low-Stock Alerts
            </label>
          </div>

          <div style={fieldStyle}>
            <label>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={settings.emailNotifications}
                onChange={handleChange}
              />{" "}
              Enable Email Notifications
            </label>
          </div>

          <small style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>
            These switches save preferences. Actual alerts and email delivery
            require additional functionality.
          </small>
        </section>

        {/* APPEARANCE SETTINGS */}
        <section style={cardStyle}>
          <h2>🎨 Appearance Settings</h2>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="theme">
              Select Theme
            </label>

            <select
              id="theme"
              name="theme"
              style={inputStyle}
              value={settings.theme}
              onChange={handleChange}
            >
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
            </select>
          </div>

          <div
            style={{
              padding: "15px",
              borderRadius: "8px",
              background: isDark ? "#111827" : "#f3f4f6",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
            }}
          >
            <strong>{settings.appName}</strong>

            <p
              style={{
                color: isDark ? "#9ca3af" : "#6b7280",
                fontSize: "13px",
                marginBottom: 0,
              }}
            >
              Theme preview
            </p>
          </div>
        </section>

        {/* SAVE AND RESET BUTTONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <button
            type="button"
            onClick={resetSettings}
            style={{
              ...buttonStyle,
              background: "#dc2626",
            }}
          >
            Reset Settings
          </button>

          <button type="submit" style={buttonStyle}>
            💾 Save Settings
          </button>
        </div>
      </form>

      <p style={{ color: isDark ? "#9ca3af" : "#6b7280", fontSize: "12px" }}>
        Settings are saved in your browser and are not stored in MySQL.
      </p>
    </main>
  );
}

export default Settings;
