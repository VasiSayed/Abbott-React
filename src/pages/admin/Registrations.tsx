import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Filter,
  Calendar,
  Users,
  Plus,
  Eye,
  EyeOff,
  X,
  Save,
  Edit,
  Trash2,
  Lock,
  Mail,
  Phone,
  Building2,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { eventsAPI, registrationsAPI, type EventDTO } from "../../utils/api";

/** API row shape when using EventJoinWithUserSerializer from the backend */
type ApiRegistrationRow = {
  id: string;
  joined_at: string; // ISO
  event: string; // uuid
  event_code: string;
  event_title: string | null;
  user?: { id: number; first_name: string; last_name: string; email: string };
  profile?: { hospital?: string; speciality?: string; phone?: string };
};

/** View model used by this table */
type RegistrationVM = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  hospital: string;
  speciality: string;
  eventId: string; // uuid
  eventCode: string;
  eventTitle: string;
  timestamp: string; // ISO
  checkbox_selections?: string; // (not present in API; kept for compatibility)
};

type EventLite = Pick<EventDTO, "id" | "code" | "title">;

const ITEMS_PER_PAGE = 10;

const Registrations: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RegistrationVM[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editing, setEditing] = useState<RegistrationVM | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    specialty: "All Specialties",
    meetingEvent: "All Meetings", // stores event UUID (or "All Meetings")
    searchTerm: "",
  });

  // Form (UI only — creating registrations from admin isn’t supported)
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    hospital: "",
    speciality: "",
    event: "",
    checkbox_selections: "",
  });

  // Password form (stub)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const specialties = [
    "All Specialties",
    "Cardiology",
    "Neurology",
    "Pediatrics",
    "Oncology",
    "Dermatology",
    "Surgery",
    "Internal Medicine",
    "Emergency Medicine",
    "Radiology",
  ];

  // ────────────────────────────────────────────────────────────────
  const toast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const mapApiRowToVM = (r: ApiRegistrationRow): RegistrationVM => {
    const first = (r.user?.first_name || "").trim();
    const last = (r.user?.last_name || "").trim();
    const fullName = [first, last].filter(Boolean).join(" ").trim();

    return {
      id: r.id,
      name: fullName || r.user?.email || "—",
      mobile: r.profile?.phone || "",
      email: r.user?.email || "",
      hospital: r.profile?.hospital || "",
      speciality: r.profile?.speciality || "",
      eventId: r.event,
      eventCode: r.event_code,
      eventTitle: r.event_title || r.event_code,
      timestamp: r.joined_at,
    };
  };

  const fetchEvents = async () => {
    try {
      const { data } = await eventsAPI.list();
      const lite = (Array.isArray(data) ? data : []).map((e) => ({
        id: e.id,
        code: e.code,
        title: e.title || e.code,
      }));
      setEvents(lite);
    } catch {
      toast("error", "Failed to fetch events");
    }
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      // Server supports filters: event (uuid), code, date_from, date_to
      const params: any = {};
      if (filters.meetingEvent !== "All Meetings")
        params.event = filters.meetingEvent;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const { data } = await registrationsAPI.list(params);
      const apiRows: ApiRegistrationRow[] = Array.isArray(data)
        ? (data as any)
        : data?.results ?? [];
      const mapped = apiRows.map(mapApiRowToVM);

      setRows(mapped);
    } catch {
      toast("error", "Failed to fetch registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Re-fetch when these change (server-side filters)
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.meetingEvent]);

  // Client-side search + specialty filter + pagination
  const filtered = useMemo(() => {
    const term = filters.searchTerm.trim().toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !term ||
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.hospital.toLowerCase().includes(term) ||
        r.eventTitle.toLowerCase().includes(term) ||
        r.eventCode.toLowerCase().includes(term);

      const matchSpec =
        filters.specialty === "All Specialties" ||
        r.speciality === filters.specialty;

      return matchSearch && matchSpec;
    });
  }, [rows, filters.searchTerm, filters.specialty]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  useEffect(() => {
    // reset to page 1 when filter or data changes
    setCurrentPage(1);
  }, [
    filters.searchTerm,
    filters.specialty,
    filters.meetingEvent,
    filters.dateFrom,
    filters.dateTo,
    rows.length,
  ]);

  const resetForm = () => {
    setFormData({
      name: "",
      mobile: "",
      email: "",
      hospital: "",
      speciality: "",
      event: "",
      checkbox_selections: "",
    });
  };

  const handleEdit = (r: RegistrationVM) => {
    setEditing(r);
    setFormData({
      name: r.name,
      mobile: r.mobile,
      email: r.email,
      hospital: r.hospital,
      speciality: r.speciality,
      event: r.eventId,
      checkbox_selections: r.checkbox_selections || "",
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Admin panel doesn’t create full users/profiles here — surface guidance
    toast(
      "error",
      "Admin cannot create/edit registrations here. Use the public registration flow."
    );
    setShowCreateModal(false);
    setEditing(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Delete this registration? This will remove the user's join record for that event."
      )
    )
      return;
    try {
      await registrationsAPI.delete(id);
      await fetchRegistrations();
      toast("success", "Registration deleted");
    } catch {
      toast("error", "Error deleting registration");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast("error", "New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast("error", "Password must be at least 8 characters long");
      return;
    }
    // Stub only
    toast("success", "Password changed (demo)");
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleExportData = async () => {
    try {
      // Client-side CSV export of the filtered rows
      const header = [
        "Name",
        "Email",
        "Mobile",
        "Hospital",
        "Speciality",
        "Event",
        "Event Code",
        "Registered At",
      ];
      const lines = filtered.map((r) =>
        [
          r.name,
          r.email,
          r.mobile,
          r.hospital,
          r.speciality,
          r.eventTitle,
          r.eventCode,
          formatTimestamp(r.timestamp),
        ]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = [header.join(","), ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "Exported CSV");
    } catch {
      toast("error", "Error exporting data");
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      specialty: "All Specialties",
      meetingEvent: "All Meetings",
      searchTerm: "",
    });
    setCurrentPage(1);
  };

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getEventTitle = (eventIdOrCode: string) => {
    const e = events.find(
      (x) => x.id === eventIdOrCode || x.code === eventIdOrCode
    );
    return e ? e.title || e.code : eventIdOrCode;
  };

  if (loading) {
    return (
      <div className="registrations-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="registrations-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.type === "success" ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">A</div>
            <span className="brand-name">Abbott</span>
          </div>
          <div className="header-actions">
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search registrations, events, etc..."
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters((s) => ({ ...s, searchTerm: e.target.value }))
                }
              />
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => setShowPasswordModal(true)}
            >
              <Lock size={16} />
              Change Password
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/login")}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar (navigate instead of href) */}
        <aside className="sidebar">
          <nav className="nav">
            <button
              className="linklike"
              onClick={() => navigate("/admin/dashboard")}
            >
              <Calendar size={18} /> Dashboard
            </button>
            <button
              className="linklike"
              onClick={() => navigate("/admin/meetings")}
            >
              <Calendar size={18} /> Manage Meetings
            </button>
            <button
              className="linklike active"
              onClick={() => navigate("/admin/registrations")}
            >
              <Users size={18} /> Registrations
            </button>
            {/* <button
              className="linklike"
              onClick={() => navigate("/admin/reports")}
            >
              <Filter size={18} /> Reports & Analytics
            </button> */}
            {/* <button
              className="linklike"
              onClick={() => navigate("/admin/export")}
            >
              <Download size={18} /> Data Export
            </button> */}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="content">
          <div className="container">
            <div className="page-header">
              <h1 className="page-title">Registrations</h1>
              <div className="header-stats">
                <div className="stat-card">
                  <span className="stat-number">{totalCount}</span>
                  <span className="stat-label">Total Registrations</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  resetForm();
                  setEditing(null);
                  setShowCreateModal(true);
                }}
              >
                <Plus size={16} />
                Create Registration
              </button>
            </div>

            {/* Filter Section */}
            <div className="filter-section">
              <div className="filter-header">
                <h2>Filter Registrations</h2>
                {(filters.dateFrom ||
                  filters.dateTo ||
                  filters.specialty !== "All Specialties" ||
                  filters.meetingEvent !== "All Meetings" ||
                  filters.searchTerm) && (
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="filter-grid">
                <div className="form-group">
                  <label>Date From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, dateFrom: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Date To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, dateTo: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Speciality</label>
                  <select
                    value={filters.specialty}
                    onChange={(e) =>
                      setFilters((s) => ({ ...s, specialty: e.target.value }))
                    }
                  >
                    {specialties.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Meeting/Event</label>
                  <select
                    value={filters.meetingEvent}
                    onChange={(e) =>
                      setFilters((s) => ({
                        ...s,
                        meetingEvent: e.target.value,
                      }))
                    }
                  >
                    <option value="All Meetings">All Meetings</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title || ev.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filter-actions">
                <button
                  onClick={fetchRegistrations}
                  className="btn btn-outline"
                >
                  <Search size={16} />
                  Apply Filters
                </button>
                <button onClick={handleExportData} className="btn btn-primary">
                  <Download size={16} />
                  Export Data
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="table-container">
              <div className="table-header">
                <h3>Registration Records</h3>
                <span className="table-count">
                  {pageRows.length} of {totalCount} records
                </span>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Hospital</th>
                      <th>Speciality</th>
                      <th>Event</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="user-info">
                            <div className="user-avatar">
                              {(r.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="user-name">{r.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="contact-info">
                            <div className="contact-item">
                              <Mail size={14} />
                              <span>{r.email || "—"}</span>
                            </div>
                            <div className="contact-item">
                              <Phone size={14} />
                              <span>{r.mobile || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="hospital-info">
                            <Building2 size={14} />
                            <span>{r.hospital || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="specialty-badge">
                            {r.speciality || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="event-name">
                            {getEventTitle(r.eventId) || r.eventCode}
                          </span>
                        </td>
                        <td>
                          <span className="timestamp">
                            {formatTimestamp(r.timestamp)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-soft btn-sm"
                              onClick={() => handleEdit(r)}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!pageRows.length && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            color: "#64748b",
                          }}
                        >
                          No registrations match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <div className="pagination-info">
                  Showing {totalCount ? pageStart + 1 : 0} to{" "}
                  {Math.min(pageStart + ITEMS_PER_PAGE, totalCount)} of{" "}
                  {totalCount} entries
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline btn-sm"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <div className="page-numbers">
                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
                        const page = Math.max(1, currentPage - 2) + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`btn btn-sm ${
                              currentPage === page
                                ? "btn-primary"
                                : "btn-outline"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="btn btn-outline btn-sm"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create/Edit Registration Modal (UI only) */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {editing ? "Edit Registration" : "Create New Registration"}
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditing(null);
                  resetForm();
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Dr. John Smith"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, email: e.target.value }))
                    }
                    placeholder="john.smith@hospital.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, mobile: e.target.value }))
                    }
                    placeholder="+1-555-0123"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Hospital/Institution *</label>
                  <input
                    type="text"
                    value={formData.hospital}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, hospital: e.target.value }))
                    }
                    placeholder="Mayo Clinic"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Speciality *</label>
                  <select
                    value={formData.speciality}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, speciality: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select Speciality</option>
                    {specialties.slice(1).map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Event *</label>
                  <select
                    value={formData.event}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, event: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title || ev.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group span-2">
                  <label>Session Selections</label>
                  <textarea
                    value={formData.checkbox_selections}
                    onChange={(e) =>
                      setFormData((s) => ({
                        ...s,
                        checkbox_selections: e.target.value,
                      }))
                    }
                    placeholder="Session A: Heart Health, Session B: ECG Reading"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditing(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner-sm"></div>
                    {editing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editing ? "Update Registration" : "Create Registration"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal (stub) */}
      {showPasswordModal && (
        <div className="modal-backdrop">
          <div className="modal password-modal">
            <div className="modal-header">
              <h2>Change Password</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="password-form">
                <div className="form-group">
                  <label>Current Password *</label>
                  <div className="password-input">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((s) => ({
                          ...s,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPasswords((s) => ({ ...s, current: !s.current }))
                      }
                    >
                      {showPasswords.current ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password *</label>
                  <div className="password-input">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((s) => ({
                          ...s,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPasswords((s) => ({ ...s, new: !s.new }))
                      }
                    >
                      {showPasswords.new ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <div className="password-requirements">
                    Password must be at least 8 characters long
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <div className="password-input">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((s) => ({
                          ...s,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))
                      }
                    >
                      {showPasswords.confirm ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePasswordChange}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner-sm"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .registrations-page {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            sans-serif;
          color: #1e293b;
        }

        /* make <button> in sidebar look like links */
        .linklike {
          width: 100%;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #64748b;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }
        .linklike:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .linklike.active {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 600;
        }

        /* Notification */
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 300px;
          animation: slideIn 0.3s ease-out;
        }
        .notification.success {
          background: #10b981;
          color: white;
        }
        .notification.error {
          background: #ef4444;
          color: white;
        }
        .notification button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          margin-left: auto;
          opacity: 0.8;
        }
        .notification button:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Loading */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 16px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Header */
        .header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-icon {
          width: 40px;
          height: 40px;
          background: #3b82f6;
          color: white;
          font-weight: 800;
          font-size: 18px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-name {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .search-container {
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .search-input {
          padding: 10px 16px 10px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          width: 320px;
          font-size: 14px;
        }
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Layout */
        .main-content {
          display: flex;
          min-height: calc(100vh - 73px);
        }
        .sidebar {
          width: 280px;
          background: white;
          border-right: 1px solid #e2e8f0;
        }
        .nav {
          padding: 24px;
        }
        .content {
          flex: 1;
          background: #f8fafc;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .page-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .header-stats {
          display: flex;
          gap: 16px;
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: white;
          padding: 16px 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          min-width: 120px;
        }
        .stat-number {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }

        /* Filter Section */
        .filter-section {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .filter-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group.span-2 {
          grid-column: span 2;
        }
        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.15s ease;
          background: white;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .filter-actions {
          display: flex;
          gap: 12px;
        }

        /* Table */
        .table-container {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .table-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        .table-count {
          font-size: 14px;
          color: #64748b;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          background: #f8fafc;
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        .data-table tr:hover {
          background: #f8fafc;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }
        .user-name {
          font-weight: 600;
          color: #1e293b;
        }
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #64748b;
        }
        .hospital-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #374151;
          font-size: 14px;
        }
        .specialty-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          background: #dbeafe;
          color: #1d4ed8;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        .event-name {
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }
        .timestamp {
          font-size: 13px;
          color: #64748b;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .pagination-info {
          font-size: 14px;
          color: #64748b;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .page-numbers {
          display: flex;
          gap: 4px;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          background: white;
          color: #374151;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
        }
        .btn-lg {
          padding: 12px 20px;
          font-size: 16px;
          font-weight: 600;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }
        .btn-outline {
          border-color: #d1d5db;
          background: white;
        }
        .btn-outline:hover:not(:disabled) {
          border-color: #9ca3af;
          background: #f9fafb;
        }
        .btn-soft {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .btn-soft:hover:not(:disabled) {
          background: #f1f5f9;
        }
        .btn-danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }
        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
          border-color: #dc2626;
        }
        .btn-ghost {
          background: transparent;
          border-color: transparent;
          color: #64748b;
        }
        .btn-ghost:hover:not(:disabled) {
          background: #f1f5f9;
          color: #374151;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 100;
          overflow-y: auto;
        }
        .modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .password-modal {
          max-width: 450px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px 0 32px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 0;
          padding-bottom: 20px;
        }
        .modal-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .modal-body {
          padding: 24px 32px;
        }
        .modal-footer {
          padding: 20px 32px 32px 32px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* Form Grid */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        /* Password Form */
        .password-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .password-input {
          position: relative;
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .password-toggle:hover {
          background: #f3f4f6;
          color: #374151;
        }
        .password-requirements {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .sidebar {
            display: none;
          }
          .main-content {
            display: block;
          }
          .container {
            padding: 24px 16px;
          }
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        @media (max-width: 768px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
          .form-group.span-2 {
            grid-column: span 1;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .modal {
            margin: 16px;
            max-height: calc(100vh - 32px);
          }
          .header-content {
            padding: 12px 16px;
            flex-direction: column;
            gap: 12px;
          }
          .search-input {
            width: 100%;
          }
          .pagination {
            flex-direction: column;
            gap: 16px;
          }
          .table-wrapper {
            overflow-x: scroll;
          }
          .data-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
};

export default Registrations;
