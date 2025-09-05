import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  Clock,
  Link as LinkIcon,
  Eye,
  Copy,
  ExternalLink,
  Upload,
  X,
  Save,
  AlertCircle,
  Check,
  Image,
  User,
  Palette,
  FileText,
  BarChart3,
} from "lucide-react";
import { eventsAPI, expertsAPI, type EventDTO } from "../../utils/api";

// Local form types
interface ExpertFormData {
  name: string;
  role: string;
  description: string;
  photo?: File;
  order: number;
}
interface EventFormData {
  code: string; // 👈 NEW
  title: string;
  description: string;
  link: string;
  start_at: string; // datetime-local
  end_at: string; // datetime-local
  color_hex: string;
  banner?: File;
}

const MeetingManagement: React.FC = () => {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<EventFormData>({
    code: "",
    title: "",
    description: "",
    link: "",
    start_at: "",
    end_at: "",
    color_hex: "#2563eb",
  });
  const [experts, setExperts] = useState<ExpertFormData[]>([]);
  const [bannerPreview, setBannerPreview] = useState<string>("");

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await eventsAPI.list();
      setEvents(data);
    } catch {
      toast("error", "Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      title: "",
      description: "",
      link: "",
      start_at: "",
      end_at: "",
      color_hex: "#2563eb",
    });
    setExperts([]);
    setBannerPreview("");
  };

  const handleEditEvent = (ev: EventDTO) => {
    setEditingEvent(ev);
    setFormData({
      code: ev.code || "",
      title: ev.title || "",
      description: ev.description || "",
      link: ev.link || "",
      start_at: ev.start_at
        ? new Date(ev.start_at).toISOString().slice(0, 16)
        : "",
      end_at: ev.end_at ? new Date(ev.end_at).toISOString().slice(0, 16) : "",
      color_hex: ev.color_hex || "#2563eb",
    });
    setBannerPreview(ev.banner_url || "");
    setExperts(
      (ev.experts || []).map((x, i) => ({
        name: x.name,
        role: x.role || "",
        description: x.description || "",
        order: typeof x.order === "number" ? x.order : i,
      }))
    );
    setShowCreateModal(true);
  };

  const handleDeleteEvent = async (code: string) => {
    if (!window.confirm("Delete this meeting? This action cannot be undone."))
      return;
    try {
      await eventsAPI.delete(code);
      await fetchEvents();
      toast("success", "Meeting deleted");
    } catch {
      toast("error", "Error deleting meeting");
    }
  };

  const hexToInt = (hex: string) => {
    try {
      return parseInt(hex.replace("#", ""), 16);
    } catch {
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Guard: require code on create
      if (!editingEvent && !formData.code.trim()) {
        toast("error", "Event code is required");
        setSubmitting(false);
        return;
      }

      // 1) JSON first
      const basePayload: Partial<EventDTO> = {
        title: formData.title.trim() || (null as any), // allow null if empty
        description: formData.description?.trim() ?? "",
        link: formData.link.trim(),
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        color: hexToInt(formData.color_hex),
        color_hex: formData.color_hex,
      };

      // include code only on create
      const payload = editingEvent
        ? basePayload
        : { ...basePayload, code: formData.code.trim() };

      const res = editingEvent
        ? await eventsAPI.update(editingEvent.code, payload)
        : await eventsAPI.create(payload);
      const event = res.data as EventDTO;

      // 2) Optional banner upload (multipart PATCH)
      if (formData.banner) {
        await eventsAPI.uploadBanner(event.code, formData.banner);
      }

      // 3) Create experts (create-only; editing existing experts would need PATCH/DELETE by id)
      for (const [idx, ex] of experts.entries()) {
        if (!ex.name.trim()) continue;
        const fd = new FormData();
        fd.append("event", event.id);
        fd.append("name", ex.name.trim());
        if (ex.role) fd.append("role", ex.role);
        if (ex.description) fd.append("description", ex.description);
        fd.append(
          "order",
          String(typeof ex.order === "number" ? ex.order : idx)
        );
        if (ex.photo) fd.append("photo", ex.photo);
        await expertsAPI.create(fd);
      }

      await fetchEvents();
      setShowCreateModal(false);
      setEditingEvent(null);
      resetForm();
      toast(
        "success",
        `Meeting ${editingEvent ? "updated" : "created"} successfully`
      );
    } catch {
      toast("error", `Error ${editingEvent ? "updating" : "creating"} meeting`);
    } finally {
      setSubmitting(false);
    }
  };

  const addExpert = () =>
    setExperts((xs) => [
      ...xs,
      { name: "", role: "", description: "", order: xs.length },
    ]);
  const removeExpert = (i: number) =>
    setExperts((xs) => xs.filter((_, idx) => idx !== i));
  const updateExpert = (i: number, field: keyof ExpertFormData, value: any) =>
    setExperts((xs) =>
      xs.map((x, idx) => (idx === i ? { ...x, [field]: value } : x))
    );

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((s) => ({ ...s, banner: file }));
      setBannerPreview(URL.createObjectURL(file));
    }
  };
  const handleExpertPhotoChange = (
    i: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0];
    if (f) updateExpert(i, "photo", f);
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formatTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadge = (ev: EventDTO) => {
    const now = new Date();
    const s = new Date(ev.start_at);
    const e = new Date(ev.end_at);
    if (ev.is_live_now) return <span className="badge live">Live Now</span>;
    if (now < s) return <span className="badge upcoming">Upcoming</span>;
    if (now >= s && now <= e)
      return <span className="badge active">Active</span>;
    return <span className="badge completed">Completed</span>;
  };

  const copyPublicUrl = async (code: string) => {
    const url = `${location.origin}/event/${code}`;
    await navigator.clipboard.writeText(url);
    toast("success", "Public page URL copied");
  };

  // ------------ UI ------------
  if (loading) {
    return (
      <div className="meeting-management">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-management">
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
            <input
              className="search-input"
              placeholder="Search admin content..."
            />
            <button className="btn btn-ghost">Logout</button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="nav">
            <a href="/admin/dashboard">
              <Users size={18} /> Dashboard
            </a>
            <a href="/admin/meetings" className="active">
              <Calendar size={18} /> Manage Meetings
            </a>
            <a href="/admin/registrations">
              <Users size={18} /> Registrations
            </a>
            {/* <a href="/admin/export">
              <ExternalLink size={18} /> Data Export
            </a> */}
          </nav>
        </aside>

        {/* Main */}
        <main className="content">
          <div className="container">
            <div className="page-header">
              <h1 className="page-title">Meeting Management</h1>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
              >
                <Plus size={16} /> Create New Meeting
              </button>
            </div>

            {/* Events */}
            <div className="events-list">
              {events.map((ev) => (
                <div key={ev.id} className="event-card">
                  <div className="event-content">
                    <div className="event-main">
                      <div className="event-header">
                        <div className="event-title-row">
                          <Calendar size={20} className="title-icon" />
                          <h3 className="event-title">
                            {ev.title || ev.code || "(Untitled Meeting)"}
                          </h3>
                          <span className="code-chip">{ev.code}</span>{" "}
                          {/* 👈 show code */}
                          {statusBadge(ev)}
                        </div>
                        {ev.color_hex && (
                          <div
                            className="color-indicator"
                            style={{ backgroundColor: ev.color_hex }}
                          />
                        )}
                      </div>

                      {!!ev.banner_url && (
                        <div className="event-banner">
                          <img src={ev.banner_url} alt="Event banner" />
                        </div>
                      )}

                      <div className="event-meta">
                        <div className="meta-item">
                          <Clock size={16} />
                          <span>
                            {formatDate(ev.start_at)} •{" "}
                            {formatTime(ev.start_at)} – {formatTime(ev.end_at)}
                          </span>
                        </div>

                        <div className="meta-item link-item">
                          <LinkIcon size={16} />
                          <a href={ev.link} target="_blank" rel="noreferrer">
                            {ev.link}
                          </a>
                        </div>

                        <div className="quick-actions">
                          <button
                            className="btn btn-soft btn-sm"
                            onClick={() => copyPublicUrl(ev.code)}
                          >
                            <Copy size={14} /> Copy URL
                          </button>
                          <a
                            className="btn btn-soft btn-sm"
                            href={`/event/${ev.code}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={14} /> View Public
                          </a>
                        </div>
                      </div>

                      {!!ev.description && (
                        <p className="event-description">{ev.description}</p>
                      )}

                      {!!ev.experts?.length && (
                        <div className="experts-section">
                          <h4 className="experts-title">Experts</h4>
                          <div className="experts-grid">
                            {ev.experts.map((x) => (
                              <div key={x.id} className="expert-chip">
                                {x.photo_url && (
                                  <img
                                    src={x.photo_url}
                                    alt={x.name}
                                    className="expert-photo"
                                  />
                                )}
                                <div className="expert-info">
                                  <span className="expert-name">{x.name}</span>
                                  {x.role && (
                                    <span className="expert-role">
                                      {x.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="event-actions">
                      <button
                        className="btn btn-outline action-btn"
                        onClick={() => handleEditEvent(ev)}
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="btn btn-danger action-btn"
                        onClick={() => handleDeleteEvent(ev.code)}
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                      <a
                        className="btn btn-outline action-btn"
                        href={`/admin/registrations?code=${encodeURIComponent(
                          ev.code
                        )}`}
                      >
                        <Eye size={16} />
                        <span>Registrations</span>
                      </a>
                      <a
                        className="btn btn-outline action-btn"
                        href={`/admin/analytics?code=${encodeURIComponent(
                          ev.code
                        )}`}
                      >
                        <BarChart3 size={16} />
                        <span>Analytics</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!events.length && (
              <div className="empty-state">
                <Calendar size={48} className="empty-icon" />
                <h3>No meetings yet</h3>
                <p>
                  Create your first meeting to get started with managing events.
                </p>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                >
                  <Plus size={16} /> Create New Meeting
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingEvent ? "Edit Meeting" : "Create New Meeting"}</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvent(null);
                  resetForm();
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-sections">
                {/* Basic */}
                <div className="form-section">
                  <h3 className="section-title">
                    <FileText size={18} />
                    Basic Information
                  </h3>

                  <div className="form-grid">
                    {/* CODE (create-time) */}
                    <div className="form-group">
                      <label>Event Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. ABC123 or abbott"
                        value={formData.code}
                        onChange={(e) => {
                          // keep it simple; trim spaces
                          const v = e.target.value.replace(/\s+/g, "");
                          setFormData({ ...formData, code: v });
                        }}
                        disabled={!!editingEvent} // can't change on edit (usually primary key)
                        required={!editingEvent}
                      />
                      <small className="hint">
                        Used in public URL: /event/&lt;code&gt;
                      </small>
                    </div>

                    <div className="form-group">
                      <label>Meeting Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="(Optional) Title shown on cards"
                      />
                    </div>

                    <div className="form-group span-2">
                      <label>Description</label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-group span-2">
                      <label>Meeting Link *</label>
                      <input
                        type="url"
                        value={formData.link}
                        onChange={(e) =>
                          setFormData({ ...formData, link: e.target.value })
                        }
                        placeholder="https://meet.google.com/..."
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={formData.start_at}
                        onChange={(e) =>
                          setFormData({ ...formData, start_at: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>End Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) =>
                          setFormData({ ...formData, end_at: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div className="form-section">
                  <h3 className="section-title">
                    <Palette size={18} />
                    Appearance
                  </h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Theme Color</label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          className="color-picker"
                          value={formData.color_hex}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              color_hex: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          className="color-text"
                          value={formData.color_hex}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              color_hex: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="form-group span-2">
                      <label>Banner Image</label>
                      <div className="file-upload-area">
                        <input
                          id="banner"
                          className="file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleBannerChange}
                        />
                        <div
                          className="file-upload-content"
                          onClick={() =>
                            document.getElementById("banner")?.click()
                          }
                        >
                          {bannerPreview ? (
                            <div className="banner-preview">
                              <img src={bannerPreview} alt="Banner preview" />
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById("banner")?.click();
                                }}
                              >
                                <Upload size={14} /> Change Image
                              </button>
                            </div>
                          ) : (
                            <div className="upload-placeholder">
                              <Image size={32} />
                              <p>Click to upload banner image</p>
                              <p className="text-sm text-muted">
                                PNG, JPG up to 5MB
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experts */}
                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      <User size={18} />
                      Experts
                    </h3>
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={addExpert}
                    >
                      <Plus size={14} /> Add Expert
                    </button>
                  </div>

                  <div className="experts-form">
                    {experts.map((ex, idx) => (
                      <div key={idx} className="expert-form-card">
                        <div className="expert-form-header">
                          <h4>Expert {idx + 1}</h4>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeExpert(idx)}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="expert-form-grid">
                          <div className="form-group">
                            <label>Name *</label>
                            <input
                              type="text"
                              value={ex.name}
                              onChange={(e) =>
                                updateExpert(idx, "name", e.target.value)
                              }
                              required={ex.name.length > 0}
                            />
                          </div>
                          <div className="form-group">
                            <label>Role</label>
                            <input
                              type="text"
                              value={ex.role}
                              onChange={(e) =>
                                updateExpert(idx, "role", e.target.value)
                              }
                            />
                          </div>
                          <div className="form-group span-2">
                            <label>Description</label>
                            <textarea
                              rows={2}
                              value={ex.description}
                              onChange={(e) =>
                                updateExpert(idx, "description", e.target.value)
                              }
                            />
                          </div>
                          <div className="form-group span-2">
                            <label>Photo</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleExpertPhotoChange(idx, e)}
                              className="file-input-simple"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {!experts.length && (
                      <div className="empty-experts">
                        <User size={32} className="empty-icon" />
                        <p>No experts added yet</p>
                        <p className="text-sm text-muted">
                          Add experts to showcase the meeting speakers
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvent(null);
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
                    <div className="spinner-sm" />{" "}
                    {editingEvent ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save size={16} />{" "}
                    {editingEvent ? "Update Meeting" : "Create Meeting"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .meeting-management {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            sans-serif;
          color: #1e293b;
        }

        .hint {
          color: #64748b;
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
          opacity: 0.8;
          margin-left: auto;
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
        .search-input {
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          width: 300px;
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
        .nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #64748b;
          text-decoration: none;
          border-radius: 8px;
          margin-bottom: 4px;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .nav a:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .nav a.active {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 600;
        }
        .content {
          flex: 1;
          background: #f8fafc;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .page-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        /* Events List */
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .event-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        .event-card:hover {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }
        .event-content {
          display: flex;
          gap: 24px;
          padding: 24px;
        }
        .event-main {
          flex: 1;
        }
        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .event-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .title-icon {
          color: #3b82f6;
        }
        .event-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .code-chip {
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
          padding: 2px 8px;
          border-radius: 9999px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
        }

        .color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        .event-banner {
          margin: 16px 0;
          border-radius: 12px;
          overflow: hidden;
        }
        .event-banner img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .event-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: center;
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
        }
        .link-item a {
          color: #3b82f6;
          text-decoration: none;
        }
        .link-item a:hover {
          text-decoration: underline;
        }
        .quick-actions {
          display: flex;
          gap: 8px;
        }

        .event-description {
          color: #374151;
          line-height: 1.6;
          margin: 16px 0;
        }

        .experts-section {
          margin-top: 20px;
        }
        .experts-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 12px 0;
        }
        .experts-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .expert-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
        }
        .expert-photo {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        .expert-info {
          display: flex;
          flex-direction: column;
        }
        .expert-name {
          font-weight: 600;
          color: #1e293b;
        }
        .expert-role {
          font-size: 12px;
          color: #64748b;
        }

        .event-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 160px;
        }
        .action-btn {
          justify-content: center;
          text-align: center;
          padding: 12px 16px;
          min-height: 44px;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge.live {
          background: #dcfce7;
          color: #166534;
        }
        .badge.upcoming {
          background: #fef3c7;
          color: #92400e;
        }
        .badge.active {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .badge.completed {
          background: #f1f5f9;
          color: #64748b;
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
          text-decoration: none;
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

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 80px 32px;
          background: white;
          border-radius: 16px;
          border: 2px dashed #d1d5db;
        }
        .empty-icon {
          color: #9ca3af;
          margin-bottom: 16px;
        }
        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        .empty-state p {
          color: #64748b;
          margin: 0 0 24px 0;
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
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

        /* Form */
        .form-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
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
        .form-group textarea {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.15s ease;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .color-input-group {
          display: flex;
          gap: 12px;
        }
        .color-picker {
          width: 60px !important;
          height: 44px;
          padding: 4px !important;
          border-radius: 8px;
          cursor: pointer;
        }
        .color-text {
          flex: 1;
        }
        .file-upload-area {
          position: relative;
        }
        .file-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        .file-input-simple {
          padding: 8px 0;
        }
        .file-upload-content {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .file-upload-content:hover {
          border-color: #3b82f6;
          background: #f8fafc;
        }
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #64748b;
        }
        .upload-placeholder p {
          margin: 0;
        }
        .text-sm {
          font-size: 12px;
        }
        .text-muted {
          color: #9ca3af;
        }
        .banner-preview {
          position: relative;
        }
        .banner-preview img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        /* Experts Form */
        .experts-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .expert-form-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          background: #fafafa;
        }
        .expert-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .expert-form-header h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        .expert-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .empty-experts {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }
        .empty-experts .empty-icon {
          margin-bottom: 12px;
        }
        .empty-experts p {
          margin: 4px 0;
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
        }
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          .event-content {
            flex-direction: column;
          }
          .event-actions {
            flex-direction: row;
            min-width: auto;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.span-2 {
            grid-column: span 1;
          }
          .expert-form-grid {
            grid-template-columns: 1fr;
          }
          .modal {
            margin: 16px;
            max-height: calc(100vh - 32px);
          }
          .header-content {
            padding: 12px 16px;
          }
          .search-input {
            width: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default MeetingManagement;
