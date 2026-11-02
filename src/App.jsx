import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import "./App.css";

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("inventoryAppSettings");

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return parsed.theme === "dark" ? "dark" : "light";
      }
    } catch (error) {
      console.error("Could not load the saved theme:", error);
    }

    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;

    try {
      const savedSettings = localStorage.getItem("inventoryAppSettings");
      const parsed = savedSettings ? JSON.parse(savedSettings) : {};

      localStorage.setItem(
        "inventoryAppSettings",
        JSON.stringify({
          ...parsed,
          theme,
        }),
      );
    } catch (error) {
      console.error("Could not save the theme preference:", error);
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className={`app ${theme}-theme`} data-theme={theme}>
        <Sidebar />

        <div className="main-area">
          <Header />

          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route path="/products" element={<Products />} />

            <Route path="/categories" element={<Categories />} />

            <Route path="/suppliers" element={<Suppliers />} />

            <Route path="/sales" element={<Sales />} />

            <Route path="/reports" element={<Reports />} />

            <Route
              path="/settings"
              element={<Settings onThemeChange={setTheme} />}
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
