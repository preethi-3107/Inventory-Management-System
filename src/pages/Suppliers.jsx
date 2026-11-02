import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/suppliers";

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // LOAD SUPPLIERS
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load suppliers.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid supplier data received from the server.");
      }

      setSuppliers(data);
    } catch (err) {
      console.error("Fetch suppliers error:", err);
      setError(
        "Unable to connect to the backend. Please check whether your backend server is running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // CLEAR FORM
  function clearForm() {
    setName("");
    setContact("");
    setEmail("");
    setEditingSupplier(null);
    setShowForm(false);
    setError("");
  }

  // OPEN ADD FORM
  function openAddForm() {
    clearForm();
    setSuccess("");
    setShowForm(true);
  }

  // OPEN EDIT FORM
  function editSupplier(supplier) {
    setEditingSupplier(supplier);
    setName(supplier.name || "");
    setContact(supplier.contact || "");
    setEmail(supplier.email || "");
    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // VALIDATE FORM
  function validateForm() {
    if (!name.trim() || !contact.trim() || !email.trim()) {
      return "Please fill in all fields.";
    }

    if (name.trim().length < 2) {
      return "Supplier name must contain at least 2 characters.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!/^[0-9+\-()\s]{7,20}$/.test(contact.trim())) {
      return "Please enter a valid contact number.";
    }

    const duplicateEmail = suppliers.some(
      (supplier) =>
        supplier.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
        String(supplier.id) !== String(editingSupplier?.id),
    );

    if (duplicateEmail) {
      return "A supplier with this email address already exists.";
    }

    return "";
  }

  // ADD OR UPDATE SUPPLIER
  async function saveSupplier(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);

    const supplierData = {
      name: name.trim(),
      contact: contact.trim(),
      email: email.trim(),
    };

    try {
      const isEditing = Boolean(editingSupplier);

      const response = await fetch(
        isEditing ? `${API_URL}/${editingSupplier.id}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(supplierData),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Failed to ${isEditing ? "update" : "add"} supplier.`,
        );
      }

      setSuccess(
        isEditing
          ? "Supplier updated successfully!"
          : "Supplier added successfully!",
      );

      clearForm();

      await fetchSuppliers();
    } catch (err) {
      console.error("Save supplier error:", err);
      setError(err.message || "Unable to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE SUPPLIER
  async function deleteSupplier(supplier) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${supplier.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(supplier.id);

    try {
      const response = await fetch(`${API_URL}/${supplier.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete supplier.");
      }

      setSuccess(`Supplier "${supplier.name}" deleted successfully!`);

      if (String(editingSupplier?.id) === String(supplier.id)) {
        clearForm();
      }

      await fetchSuppliers();
    } catch (err) {
      console.error("Delete supplier error:", err);
      setError(err.message || "Unable to delete supplier. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // FILTER AND SORT SUPPLIERS
  const filteredSuppliers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const result = suppliers.filter((supplier) => {
      return (
        supplier.name?.toLowerCase().includes(searchText) ||
        supplier.contact?.toLowerCase().includes(searchText) ||
        supplier.email?.toLowerCase().includes(searchText) ||
        String(supplier.id).includes(searchText)
      );
    });

    result.sort((a, b) => {
      if (sortOrder === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortOrder === "oldest") {
        return Number(a.id) - Number(b.id);
      }

      return Number(b.id) - Number(a.id);
    });

    return result;
  }, [suppliers, search, sortOrder]);

  // SUMMARY COUNTS
  const totalSuppliers = suppliers.length;

  const suppliersWithEmail = suppliers.filter((supplier) =>
    supplier.email?.trim(),
  ).length;

  const suppliersWithContact = suppliers.filter((supplier) =>
    supplier.contact?.trim(),
  ).length;

  return (
    <main className="page suppliers-page">
      {/* PAGE HEADING */}
      <div className="page-heading">
        <div>
          <h1>Suppliers</h1>
          <p>Manage your supplier information in one place.</p>
        </div>

        <div className="supplier-heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={fetchSuppliers}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openAddForm}
          >
            + Add Supplier
          </button>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="supplier-alert supplier-alert-success" role="status">
          <span>✓</span>
          <span>{success}</span>

          <button
            type="button"
            aria-label="Dismiss success message"
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="supplier-alert supplier-alert-error" role="alert">
          <span>⚠</span>
          <span>{error}</span>

          <button
            type="button"
            aria-label="Dismiss error message"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <section className="supplier-stats">
        <div className="supplier-stat-card">
          <div className="supplier-stat-icon supplier-icon-purple">♙</div>
          <div>
            <p>Total Suppliers</p>
            <h2>{totalSuppliers}</h2>
            <span>Registered suppliers</span>
          </div>
        </div>

        <div className="supplier-stat-card">
          <div className="supplier-stat-icon supplier-icon-green">✓</div>
          <div>
            <p>Contact Details</p>
            <h2>{suppliersWithContact}</h2>
            <span>Suppliers with contact numbers</span>
          </div>
        </div>

        <div className="supplier-stat-card">
          <div className="supplier-stat-icon supplier-icon-blue">✉</div>
          <div>
            <p>Email Records</p>
            <h2>{suppliersWithEmail}</h2>
            <span>Suppliers with email addresses</span>
          </div>
        </div>
      </section>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="panel supplier-form-panel">
          <div className="panel-header">
            <div>
              <h2>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h2>
              <p>
                {editingSupplier
                  ? "Update the supplier's information."
                  : "Enter the details of your new supplier."}
              </p>
            </div>

            <button
              type="button"
              className="supplier-close-button"
              onClick={clearForm}
              aria-label="Close supplier form"
            >
              ×
            </button>
          </div>

          <form onSubmit={saveSupplier}>
            <div className="supplier-form-grid">
              <div className="form-group">
                <label htmlFor="supplier-name">Supplier Name *</label>

                <input
                  id="supplier-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter supplier name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="supplier-contact">Contact Number *</label>

                <input
                  id="supplier-contact"
                  type="tel"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="Enter contact number"
                  maxLength={20}
                  required
                />
              </div>

              <div className="form-group supplier-email-field">
                <label htmlFor="supplier-email">Email Address *</label>

                <input
                  id="supplier-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@company.com"
                  maxLength={150}
                  required
                />
              </div>
            </div>

            <div className="supplier-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={clearForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingSupplier
                    ? "Update Supplier"
                    : "Save Supplier"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SEARCH AND SORT */}
      <section className="panel supplier-list-panel">
        <div className="supplier-toolbar">
          <div className="supplier-list-title">
            <h2>Supplier Directory</h2>
            <p>
              {filteredSuppliers.length} of {totalSuppliers} suppliers
            </p>
          </div>

          <div className="supplier-toolbar-controls">
            <div className="supplier-search">
              <span aria-hidden="true">⌕</span>

              <input
                type="search"
                placeholder="Search suppliers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search suppliers"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              aria-label="Sort suppliers"
              className="supplier-sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {/* SUPPLIERS TABLE */}
        <div className="table-wrapper">
          <table className="supplier-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Supplier</th>
                <th>Contact Number</th>
                <th>Email Address</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="supplier-empty-state">
                    <div className="supplier-loading-spinner"></div>
                    <p>Loading suppliers...</p>
                  </td>
                </tr>
              ) : filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <span className="supplier-id">#{supplier.id}</span>
                    </td>

                    <td>
                      <div className="supplier-name-cell">
                        <div className="supplier-avatar">
                          {(supplier.name || "S")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <strong>{supplier.name}</strong>
                      </div>
                    </td>

                    <td>{supplier.contact || "—"}</td>

                    <td>
                      <span className="supplier-email">
                        {supplier.email || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="supplier-action-buttons">
                        <button
                          type="button"
                          className="supplier-edit-button"
                          onClick={() => editSupplier(supplier)}
                          title="Edit supplier"
                          aria-label={`Edit ${supplier.name}`}
                          disabled={deletingId === supplier.id}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="supplier-delete-button"
                          onClick={() => deleteSupplier(supplier)}
                          title="Delete supplier"
                          aria-label={`Delete ${supplier.name}`}
                          disabled={deletingId === supplier.id}
                        >
                          {deletingId === supplier.id ? "…" : "⌫"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="supplier-empty-state">
                    <div className="supplier-empty-icon">♙</div>

                    <h3>
                      {search ? "No matching suppliers" : "No suppliers yet"}
                    </h3>

                    <p>
                      {search
                        ? "Try another name, contact number, or email."
                        : "Add your first supplier to get started."}
                    </p>

                    {!search && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={openAddForm}
                      >
                        + Add Supplier
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER */}
        {!loading && filteredSuppliers.length > 0 && (
          <div className="supplier-table-footer">
            Showing {filteredSuppliers.length} supplier
            {filteredSuppliers.length !== 1 ? "s" : ""}
          </div>
        )}
      </section>
    </main>
  );
}

export default Suppliers;
