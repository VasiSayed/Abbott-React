import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import "./EventRegistrationPage.css";
import Abbot from "./Abbot.png";
import { eventsAPI, authAPI } from "../../../src/utils/api";
import {
  ExternalLink,
  User,
  Phone,
  Mail,
  Building,
  Stethoscope,
  Lock,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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

// Tiny toast helper
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
  const [timeLeft, setTimeLeft] = useState("");
  const [joining, setJoining] = useState(false);

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [login, setLogin] = useState({
    userOrEmail: "",
    password: "",
    loading: false,
    err: "",
    ok: false,
  });

  // login/join info box
  const [joinNotice, setJoinNotice] = useState<string>("");

  // toast
  const [toast, setToast] = useState<ToastState>(null);
  const pushToast = (type: ToastState["type"], message: string) => {
    setToast({ type, message });
    window.clearTimeout((pushToast as any)._t);
    (pushToast as any)._t = window.setTimeout(() => setToast(null), 4200);
  };

  // load event
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

  // countdown
  useEffect(() => {
    if (!event) return;
    const tick = () => {
      const now = Date.now();
      const start = new Date(event.start_at).getTime();
      const diff = start - now;
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${d > 0 ? `${d}d ` : ""}${String(h).padStart(2, "0")}:${String(
            m
          ).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        );
      } else {
        setTimeLeft("Event Started");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [event?.start_at]);

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

  // REGISTER + attempt join (public)
const handleJoinEvent = async () => {
  if (!canLegallyProceed) {
    pushToast("error", "Please accept both legal requirements to proceed.");
    return;
  }
  setJoining(true);
  setJoinNotice("");

  // 1) call register+join but DON'T let axios throw kill the UX
  let regRes: any;
  try {
    regRes = await eventsAPI.registerAndJoin(code, {
      name: form.name,
      mobile: form.mobile,
      email: form.email,
      hospital: form.hospital,
      speciality: form.speciality,
      accept_policy: form.accept_policy,
      accept_recording: form.accept_recording,
      contact_optin: form.contact_optin,
    });
  } catch (e: any) {
    regRes = e?.response; // use the server response (e.g., 400, 409)
  }

  const data = regRes?.data || {};
  const status = regRes?.status ?? 0;

  // store tokens if present
  if (data.tokens?.access)
    localStorage.setItem("access_token", data.tokens.access);
  if (data.tokens?.refresh)
    localStorage.setItem("refresh_token", data.tokens.refresh);

  if (data.ok && data.link) {
    // success: open meeting
    pushToast("success", "Joining now…");
    window.open(data.link, "_blank");
    setJoining(false);
    return;
  }

  // 409 => account already exists
  if (status === 409 || data?.reason === "account_exists") {
    pushToast("info", "Account exists. Please login to continue.");
    setAuthMode("login");
    setLogin((p) => ({ ...p, userOrEmail: form.email }));
    setJoining(false);
    return;
  }

  // 4xx => informative join/validation message (e.g., outside window)
  if (status >= 400 && status < 500) {
    const msg =
      data.message ||
      "You can join from 15 minutes before the start time until the event ends.";
    setJoinNotice(msg); // inline info box under the header
    pushToast("info", msg); // blue/info toast (same style as login)
    setJoining(false);
    return;
  }

  // anything else -> real error
  pushToast("error", data.message || "Error during registration.");
  setJoining(false);
};


  // LOGIN + authenticated join (creates EventJoin + JoinLog)
const doLogin = async (e?: React.FormEvent) => {
  e?.preventDefault();
  setLogin((p) => ({ ...p, loading: true, err: "" }));
  setJoinNotice("");

  // ---- 1) AUTHENTICATE (real credentials errors handled here) ----
  try {
    const payload = login.userOrEmail.includes("@")
      ? { email: login.userOrEmail, password: login.password }
      : { username: login.userOrEmail, password: login.password };

    const { data } = await authAPI.login(payload);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
  } catch (authErr: any) {
    const msg =
      authErr?.response?.data?.detail ||
      authErr?.response?.data?.non_field_errors?.[0] ||
      "Invalid credentials";
    setLogin((p) => ({ ...p, loading: false, err: msg, ok: false }));
    pushToast("error", msg);
    return; // stop here on bad credentials
  }

  // ---- 2) TRY JOIN (treat 4xx as info, not as auth failure) ----
  let joinResponse: any;
  try {
    joinResponse = await eventsAPI.joinAuth(code); // 200 ok
  } catch (je: any) {
    joinResponse = je?.response; // 4xx/5xx -> use response safely
  }

  const jdata = joinResponse?.data || {};
  if (jdata.ok && jdata.link) {
    pushToast("success", "Joining now…");
    window.open(jdata.link, "_blank");
    setLogin((p) => ({ ...p, loading: false, ok: true, err: "" }));
  } else {
    const msg =
      jdata.message ||
      "You can join from 15 minutes before the start time until the event ends.";
    setJoinNotice(msg);
    pushToast("info", msg);
    setLogin((p) => ({ ...p, loading: false, ok: true, err: "" }));
  }
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

  return (
    <div className="event-page" style={{ ["--accent" as any]: accent }}>
      {/* Toast */}
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
            {event.experts?.length ? (
              <>
                <h2 className="event-section">Event Experts</h2>
                <div className="event-experts">
                  {event.experts
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((ex) => (
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
                          {ex.role && (
                            <div className="event-expert__role">{ex.role}</div>
                          )}
                          {ex.description && (
                            <div className="event-expert__desc">
                              {ex.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="event-muted">Experts will be announced soon.</p>
            )}
          </div>

          {/* RIGHT: Auth + form */}
          <div className="event-card">
            <div className="event-headrow">
              <h2 className="event-section">Registration Details</h2>
              <div className="event-auth">
                <button
                  className={authMode === "register" ? "is-active" : ""}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  Register
                </button>
                <button
                  className={authMode === "login" ? "is-active" : ""}
                  onClick={() => setAuthMode("login")}
                  type="button"
                >
                  Login
                </button>
              </div>
            </div>

            {/* inline notice when join isn't allowed yet */}
            {!!joinNotice && (
              <div className="join-notice">
                <Info size={18} />
                <div>{joinNotice}</div>
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={doLogin}>
                <label className="event-label">
                  <Lock size={16} /> Username / Email
                </label>
                <input
                  className="event-input"
                  value={login.userOrEmail}
                  onChange={(e) =>
                    setLogin({ ...login, userOrEmail: e.target.value })
                  }
                  autoComplete="username"
                />
                <div style={{ marginTop: 16 }}>
                  <label className="event-label">
                    <Lock size={16} /> Password
                  </label>
                  <input
                    className="event-input"
                    type="password"
                    value={login.password}
                    onChange={(e) =>
                      setLogin({ ...login, password: e.target.value })
                    }
                    autoComplete="current-password"
                  />
                </div>
                {login.err && (
                  <div className="event-err" style={{ marginTop: 12 }}>
                    {login.err}
                  </div>
                )}
                {login.ok && !login.err && (
                  <div className="event-ok" style={{ marginTop: 12 }}>
                    Logged in. {joinNotice ? "" : "Attempting to join…"}
                  </div>
                )}
                <div className="event-joinwrap" style={{ marginTop: 18 }}>
                  <button className="event-join" disabled={login.loading}>
                    {login.loading ? "Logging in..." : "Login"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="event-row">
                  <div>
                    <label className="event-label">
                      <User size={16} /> Name *
                    </label>
                    <input
                      className="event-input"
                      value={form.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="event-label">
                      <Phone size={16} /> Mobile No. *
                    </label>
                    <input
                      className="event-input"
                      type="tel"
                      value={form.mobile}
                      onChange={(e) =>
                        handleFormChange("mobile", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <label className="event-label">
                    <Mail size={16} /> E-mail *
                  </label>
                  <input
                    className="event-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                  />
                </div>

                <div className="event-row" style={{ marginTop: 18 }}>
                  <div>
                    <label className="event-label">
                      <Building size={16} /> Hospital Name *
                    </label>
                    <input
                      className="event-input"
                      value={form.hospital}
                      onChange={(e) =>
                        handleFormChange("hospital", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="event-label">
                      <Stethoscope size={16} /> Specialty *
                    </label>
                    <input
                      className="event-input"
                      value={form.speciality}
                      onChange={(e) =>
                        handleFormChange("speciality", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="event-legal">
                  <h3 className="event-legal__title">LEGAL NOTICE</h3>
                  <p className="event-muted">
                    This event is intended only for invited/requested attendees.
                    Do not disseminate or copy any information contained herein.
                  </p>

                  <div className="event-legal__block">
                    <p className="event-muted">
                      1. For event registration, you accept Abbott's
                      collection/use/processing of your personal information for
                      this and other heart failure related activities.
                    </p>
                    <label className="event-check">
                      <input
                        type="checkbox"
                        checked={form.accept_policy}
                        onChange={(e) =>
                          handleFormChange("accept_policy", e.target.checked)
                        }
                      />
                      <span>I agree</span>
                    </label>
                  </div>

                  <div className="event-legal__block">
                    <p className="event-muted">
                      2. You consent to recording of this meeting and its use
                      for internal/external purposes.
                    </p>
                    <label className="event-check">
                      <input
                        type="checkbox"
                        checked={form.accept_recording}
                        onChange={(e) =>
                          handleFormChange("accept_recording", e.target.checked)
                        }
                      />
                      <span>I agree</span>
                    </label>
                  </div>

                  <div className="event-legal__block">
                    <p className="event-muted">
                      For future Heart Failure education & product/service
                      information, may Abbott contact you via email?
                    </p>
                    <div className="event-radio-row">
                      <label className="event-radio">
                        <input
                          type="radio"
                          name="contact_optin"
                          checked={form.contact_optin === "Yes"}
                          onChange={() =>
                            handleFormChange("contact_optin", "Yes")
                          }
                        />
                        <span>Yes</span>
                      </label>
                      <label className="event-radio">
                        <input
                          type="radio"
                          name="contact_optin"
                          checked={form.contact_optin === "No"}
                          onChange={() =>
                            handleFormChange("contact_optin", "No")
                          }
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="event-time">
                  <div className="event-time__grid">
                    <div>
                      <strong>Opens:</strong>
                      <div>{formatDateTime(event.window_opens_at).date}</div>
                      <div>{formatDateTime(event.window_opens_at).time}</div>
                    </div>
                    <div>
                      <strong>Live Event:</strong>
                      <div>
                        {startInfo.time} – {endInfo.time}
                      </div>
                    </div>
                  </div>

                  {!canJoinWindow && (
                    <div className="event-countdown">
                      <div className="event-countdown__label">
                        Event starts in:
                      </div>
                      <div className="event-countdown__value">{timeLeft}</div>
                    </div>
                  )}
                </div>

                <div className="event-joinwrap">
                  <button
                    onClick={handleJoinEvent}
                    disabled={!canLegallyProceed || joining}
                    className="event-join"
                    style={{ opacity: joining ? 0.6 : 1 }}
                  >
                    <ExternalLink size={18} /> CLICK HERE TO JOIN
                    <img src="/abbott.png" alt="Abbott" className="join-logo" />
                  </button>
                  {!canLegallyProceed && (
                    <div className="event-err">
                      Please accept both legal requirements to proceed.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer (logo image instead of “A Abbott” pill) */}
      <footer className="event-footer">
        <img src="/abbott.png" alt="Abbott" className="foot-logo" />
      </footer>
    </div>
  );
}
