import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getEvent } from "../utils/api";
import type { EventDTO } from "../utils/api";
import { secondsUntil, asHMS, fmt } from "../utils/time";
import ExpertsGrid from "../components/ExpertsGrid";
import JoinButton from "../components/JoinButton";

type FormState = {
  name: string;
  mobile: string;
  email: string;
  hospital: string;
  speciality: string;
  accept_policy: boolean; // 1. collection/use/processing
  accept_recording: boolean; // 1. recording/usage
  contact_optin: "Yes" | "No"; // 2. contact for updates
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

export default function EventPage() {
  const { code = "" } = useParams();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ ...initialForm });
  const [secLeft, setSecLeft] = useState<number>(0);

  // fetch event
  useEffect(() => {
    let on = true;
    setLoading(true);
    getEvent(code)
      .then(({ data }) => {
        if (!on) return;
        setEvent(data);
        setError(null);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || "Event not found.";
        setError(msg);
        setEvent(null);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [code]);

  // countdown
  useEffect(() => {
    if (!event) return;
    const tick = () => setSecLeft(secondsUntil(event.window_opens_at));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [event?.window_opens_at]);

  const accent = event?.color_hex ?? "#1e90ff";
  const canJoinWindow = useMemo(() => {
    if (!event) return false;
    const now = new Date();
    return (
      now >= new Date(event.window_opens_at) && now <= new Date(event.end_at)
    );
  }, [event]);

  const banner = event?.banner_url || "/banner.jpg";

  function onFormChange<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const canLegallyProceed = form.accept_policy && form.accept_recording;

  return (
    <div className="page">
      {/* Hero */}
      <header className="hero" style={{ backgroundImage: `url(${banner})` }}>
        <div className="overlay" />
        <div className="hero-content">
          <div className="eyebrow">
            Friday, {event ? new Date(event.start_at).toLocaleDateString() : ""}{" "}
            |{" "}
            {event
              ? new Date(event.start_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}{" "}
            –{" "}
            {event
              ? new Date(event.end_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </div>
          <h1 className="title">{event ? event.title : "Loading…"}</h1>
        </div>
      </header>

      {/* Main two-column */}
      <section className="container">
        {/* Left: experts */}
        <aside className="left">
          {loading && <div className="card skeleton" />}
          {error && <div className="error">{error}</div>}
          {event && <ExpertsGrid experts={event.experts || []} />}
        </aside>

        {/* Right: form + legal + join */}
        <main className="right">
          <div className="form-card">
            <div className="row">
              <label>Name :</label>
              <input
                value={form.name}
                onChange={(e) => onFormChange("name", e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="row">
              <label>Mobile No. :</label>
              <input
                value={form.mobile}
                onChange={(e) => onFormChange("mobile", e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="row">
              <label>E-mail :</label>
              <input
                value={form.email}
                onChange={(e) => onFormChange("email", e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="row">
              <label>Hospital Name :</label>
              <input
                value={form.hospital}
                onChange={(e) => onFormChange("hospital", e.target.value)}
                placeholder="Hospital / Institution"
              />
            </div>
            <div className="row">
              <label>Specialty :</label>
              <input
                value={form.speciality}
                onChange={(e) => onFormChange("speciality", e.target.value)}
                placeholder="e.g., Cardiology"
              />
            </div>

            <div className="legal">
              <div className="legal-title">LEGAL NOTICE</div>
              <p>
                This event is intended only for invited/requested attendees. Do
                not disseminate or copy any information contained herein.
              </p>
              <ol>
                <li>
                  For event registration, you accept Abbott’s
                  collection/use/processing of your personal information for
                  this and other heart failure related activities.
                  <div className="checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.accept_policy}
                        onChange={(e) =>
                          onFormChange("accept_policy", e.target.checked)
                        }
                      />{" "}
                      I agree
                    </label>
                  </div>
                </li>
                <li>
                  You consent to recording of this meeting and its use for
                  internal/external purposes.
                  <div className="checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.accept_recording}
                        onChange={(e) =>
                          onFormChange("accept_recording", e.target.checked)
                        }
                      />{" "}
                      I agree
                    </label>
                  </div>
                </li>
              </ol>
              <div className="optin">
                For future Heart Failure education & product/service
                information, may Abbott contact you via email?
                <div className="radios">
                  <label>
                    <input
                      type="radio"
                      name="opt"
                      checked={form.contact_optin === "Yes"}
                      onChange={() => onFormChange("contact_optin", "Yes")}
                    />{" "}
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="opt"
                      checked={form.contact_optin === "No"}
                      onChange={() => onFormChange("contact_optin", "No")}
                    />{" "}
                    No
                  </label>
                </div>
              </div>
            </div>

            {event && (
              <>
                {/* Timing strip */}
                <div className="timing" style={{ borderColor: accent }}>
                  <div>
                    <strong>Opens:</strong> {fmt(event.window_opens_at)}
                  </div>
                  <div>
                    <strong>Live:</strong> {fmt(event.start_at)} –{" "}
                    {fmt(event.end_at)}
                  </div>
                  {!canJoinWindow && (
                    <div className="countdown">
                      Starts in: <span className="count">{asHMS(secLeft)}</span>
                    </div>
                  )}
                </div>

                <JoinButton
                  code={code}
                  accent={accent}
                  disabled={!canLegallyProceed}
                  onError={(msg) => alert(msg)}
                />
                {!canLegallyProceed && (
                  <div className="hint">
                    Please accept both checkboxes to proceed.
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </section>
    </div>
  );
}
