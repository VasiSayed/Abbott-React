import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import "./EventRegistrationPage.css";
import { eventsAPI } from "../../../src/utils/api";
import { Info, CheckCircle2, XCircle } from "lucide-react";

type Expert = {
  id: string;
  name: string;
  role?: string;
  description?: string;
  photo_url?: string;
  order: number;
};
type EventDTO = {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  link: string;
  color_hex?: string | null;
  banner_url?: string | null;
  start_at: string;
  end_at: string;
  window_opens_at: string;
  experts: Expert[];
};
type FormState = {
  name: string;
  mobile: string;
  email: string;
  hospital: string;
  speciality: string;
  accept_policy: boolean;
  accept_recording: boolean;
  contact_optin: "Yes" | "No";
};
const initialForm: FormState = {
  name: "",
  mobile: "",
  email: "",
  hospital: "",
  speciality: "",
  accept_policy: false,
  accept_recording: false,
  contact_optin: "No",
};

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function EventRegistrationPage() {
  const { code = "" } = useParams<{ code: string }>();

  const [event, setEvent] = useState<EventDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({ ...initialForm });
  const [joining, setJoining] = useState(false);

  const [joinNotice, setJoinNotice] = useState<string>("");
  const [toast, setToast] = useState<ToastState>(null);

  const pushToast = (type: ToastState["type"], message: string) => {
    setToast({ type, message });
    window.clearTimeout((pushToast as any)._t);
    (pushToast as any)._t = window.setTimeout(() => setToast(null), 4200);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await eventsAPI.get(code);
        setEvent(res.data);
        setError(null);
      } catch (err: any) {
        const message = err?.response?.data?.detail || "Event not found.";
        setError(message);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const accent = event?.color_hex || "#1e90ff";
  const banner = event?.banner_url || "/api/placeholder/1200/400";

  const canJoinWindow = useMemo(() => {
    if (!event) return false;
    const now = new Date();
    return (
      now >= new Date(event.window_opens_at) && now <= new Date(event.end_at)
    );
  }, [event]);

  const handleFormChange = <K extends keyof FormState>(
    key: K,
    val: FormState[K]
  ) => setForm((p) => ({ ...p, [key]: val }));

  const canLegallyProceed = form.accept_policy && form.accept_recording;

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const startInfo = event
    ? formatDateTime(event.start_at)
    : { date: "", time: "" };
  const endInfo = event ? formatDateTime(event.end_at) : { date: "", time: "" };

  const handleJoinEvent = async () => {
    if (!canLegallyProceed) return;
    setJoining(true);
    setJoinNotice("");

    let regRes: any;
    try {
      regRes = await eventsAPI.registerAndJoin(code, { ...form });
    } catch (e: any) {
      regRes = e?.response;
    }

    const data = regRes?.data || {};
    const status = regRes?.status ?? 0;

    if (data.ok && data.link) {
      pushToast("success", "Joining now…");
      window.open(data.link, "_blank");
      setJoining(false);
      return;
    }
    if (status === 409 || data?.reason === "account_exists") {
      pushToast("info", "Account exists. Please login to continue.");
      setJoining(false);
      return;
    }
    if (status >= 400 && status < 500) {
      const msg =
        data.message ||
        "You can join from 15 minutes before the start time until the event ends.";
      setJoinNotice(msg);
      pushToast("info", msg);
      setJoining(false);
      return;
    }
    pushToast("error", data.message || "Error during registration.");
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="event-page" style={{ ["--accent" as any]: accent }}>
        <div className="loading">
          <div className="spinner" />
          <p>Loading event details…</p>
        </div>
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="event-page" style={{ ["--accent" as any]: accent }}>
        <div className="error">
          <div className="error-emoji">❌</div>
          <h1>Event Not Found</h1>
          <p>{error || "Please check your link."}</p>
        </div>
      </div>
    );
  }

  // group experts by role
  const groupedExperts = event.experts.reduce(
    (acc: Record<string, Expert[]>, ex) => {
      if (!acc[ex.role || ""]) acc[ex.role || ""] = [];
      acc[ex.role || ""].push(ex);
      return acc;
    },
    {}
  );

  return (
    <div className="event-page" style={{ ["--accent" as any]: accent }}>
      {toast && (
        <div className={`ep-toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : toast.type === "error" ? (
            <XCircle size={18} />
          ) : (
            <Info size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="event-hero">
        <div
          className="event-hero__img"
          style={{ backgroundImage: `url(${banner})` }}
        />
      </div>

      <div className="event-date">
        {startInfo.date} &nbsp;|&nbsp; {startInfo.time} – {endInfo.time} IST
      </div>

      <div className="event-content">
        <div className="event-grid">
          {/* LEFT: Experts */}
          <div className="event-card">
            {Object.entries(groupedExperts).map(([role, group]) => (
              <div key={role} className="expert-group">
                <h3 className="expert-role">{role}</h3>
                {group.map((ex) => (
                  <div key={ex.id} className="event-expert">
                    {ex.photo_url ? (
                      <img
                        className="event-expert__avatar"
                        src={ex.photo_url}
                        alt={ex.name}
                      />
                    ) : (
                      <div className="event-expert__ph">
                        {ex.name?.[0] || "E"}
                      </div>
                    )}
                    <div>
                      <p className="event-expert__name">{ex.name}</p>
                      {ex.description && (
                        <div className="event-expert__desc">
                          {ex.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* RIGHT: Form + Legal Notice */}
          <div className="event-card">
            <div className="event-form">
              <div className="form-field">
                <label className="event-label">Name :</label>
                <input
                  className="event-input"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="event-label">Mobile No. :</label>
                <input
                  className="event-input"
                  value={form.mobile}
                  onChange={(e) => handleFormChange("mobile", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="event-label">E-mail :</label>
                <input
                  className="event-input"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="event-label">Hospital Name :</label>
                <input
                  className="event-input"
                  value={form.hospital}
                  onChange={(e) => handleFormChange("hospital", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="event-label">Specialty :</label>
                <input
                  className="event-input"
                  value={form.speciality}
                  onChange={(e) =>
                    handleFormChange("speciality", e.target.value)
                  }
                />
              </div>
            </div>

            {/* LEGAL NOTICE */}
            <div className="event-legal">
              <h3 className="event-legal__title">LEGAL NOTICE</h3>
              <p className="event-muted">
                This event is intended only for individuals or entities who have
                been invited/requested to attend. If you are not such an
                attendee, please do not attempt to join this meeting. You may
                not disseminate, distribute or copy any information contained
                herein.
              </p>

              <p className="event-muted">
                1. For the purposes of event registration, you accept and agree
                to:
              </p>

              <label className="event-check">
                <input
                  type="checkbox"
                  checked={form.accept_policy}
                  onChange={(e) =>
                    handleFormChange("accept_policy", e.target.checked)
                  }
                />
                <span>
                  Abbott's collection, use, transfer, and/or processing of any
                  of your personal information provided hereunder, for the
                  purposes of this and other heart failure related activities.
                </span>
              </label>

              <label className="event-check">
                <input
                  type="checkbox"
                  checked={form.accept_recording}
                  onChange={(e) =>
                    handleFormChange("accept_recording", e.target.checked)
                  }
                />
                <span>
                  Abbott's recording of this meeting in any format, including
                  its perpetual right to store, transmit and use such recordings
                  for any internal or external purpose(s).
                </span>
              </label>

              <p className="event-muted" style={{ marginTop: "12px" }}>
                2. For the purpose of the event registration, do you accept to
                be contacted via email messages, by Abbott, its affiliates,
                contractors/in relation to Heart Failure education and Abbott's
                products and/or services related information.
              </p>

              <div className="event-radio-row">
                <label className="event-radio">
                  <input
                    type="radio"
                    name="contact_optin"
                    checked={form.contact_optin === "Yes"}
                    onChange={() => handleFormChange("contact_optin", "Yes")}
                  />
                  <span>Yes</span>
                </label>
                <label className="event-radio">
                  <input
                    type="radio"
                    name="contact_optin"
                    checked={form.contact_optin === "No"}
                    onChange={() => handleFormChange("contact_optin", "No")}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {/* Button + Logo */}
            <div className="event-joinwrap">
              <button
                onClick={handleJoinEvent}
                disabled={!canLegallyProceed || joining}
                className="event-join"
              >
                CLICK HERE TO JOIN
              </button>
              <img src="/abbott.png" alt="Abbott" className="foot-logo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
