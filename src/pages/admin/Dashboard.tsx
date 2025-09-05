// src/pages/admin/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Calendar,
  TrendingUp,
  FileText,
  ActivitySquare,
} from "lucide-react";
import { analyticsAPI, usersAPI } from "../../utils/api";

/** Existing cards shape from analyticsAPI.dashboard() */
type Cards = {
  total_registrations: number; // distinct users who registered at least once
  upcoming_meetings: number; // count of events with start_at > now
  registrations_last_7_days: number; // distinct registrants in the last 7 days
  reports_last_month: number; // reports created in last 30 days
};

type Daily = { labels: string[]; counts: number[] };
type Speciality = { labels: string[]; counts: number[] };

/** New endpoint shape from /api/users/non-staff/ */
type NonStaffResp = {
  users: {
    count_total: number;
    last_7_days: number;
    last_30_days: number;
  };
  joins: {
    total: number;
    last_7_days: number;
    last_30_days: number;
  };
  events: {
    live_now: number;
  };
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [cards, setCards] = useState<Cards>({
    total_registrations: 0,
    upcoming_meetings: 0,
    registrations_last_7_days: 0,
    reports_last_month: 0,
  });

  const [daily, setDaily] = useState<Daily>({ labels: [], counts: [] });
  const [speciality, setSpeciality] = useState<Speciality>({
    labels: [],
    counts: [],
  });

  const [nonStaff, setNonStaff] = useState<NonStaffResp>({
    users: { count_total: 0, last_7_days: 0, last_30_days: 0 },
    joins: { total: 0, last_7_days: 0, last_30_days: 0 },
    events: { live_now: 0 },
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, usersRes] = await Promise.all([
          analyticsAPI.dashboard(),
          usersAPI.nonStaff(),
        ]);
        const d = dashRes.data;
        setCards(d.cards);
        setDaily(d.daily);
        setSpeciality(d.speciality);
        setNonStaff(usersRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dailySeries = useMemo(
    () =>
      daily.labels.map((label: string, i: number) => ({
        date: label,
        count: daily.counts[i] ?? 0,
      })),
    [daily]
  );

  const pieData = useMemo(
    () =>
      speciality.labels.map((label: string, i: number) => ({
        specialty: label,
        count: speciality.counts[i] ?? 0,
      })),
    [speciality]
  );

  const COLORS = [
    "#2563EB",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#22C55E",
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {}
    navigate("/admin/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="dash page">
        <div className="skeleton header" />
        <div className="skeleton grid" />
      </div>
    );
  }

  return (
    <div className="dash page">
      {/* Top bar */}
      <header className="dash__topbar">
        <div className="brand">
          <div className="logo">A</div>
          <span>Abbott</span>
        </div>
        <div className="topbar__right">
          <input className="search" placeholder="Search admin content..." />
          <button className="ghost-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dash__main">
        {/* Sidebar */}
        <aside className="dash__sidebar">
          <a className="navitem navitem--active" href="/admin/dashboard">
            <TrendingUp size={18} />
            <span>Dashboard</span>
          </a>
          <a className="navitem" href="/admin/meetings">
            <Calendar size={18} />
            <span>Manage Meetings</span>
          </a>
          <a className="navitem" href="/admin/registrations">
            <Users size={18} />
            <span>Registrations</span>
          </a>
          {/* <a className="navitem" href="/admin/export">
            <FileText size={18} />
            <span>Data Export</span>
          </a> */}
        </aside>

        {/* Content */}
        <main className="dash__content">
          <h1 className="h1">Dashboard Overview</h1>
          <p className="muted">
            Welcome to your admin dashboard. Here's a quick look at your webinar
            statistics.
          </p>

          {/* Original metric cards */}
          <section className="cards">
            <div className="card">
              <div>
                <div className="label">Total Registrations</div>
                <div className="value">
                  {cards.total_registrations.toLocaleString()}
                </div>
                <div className="sublabel">from all time</div>
              </div>
              <Users className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Upcoming Meetings</div>
                <div className="value">{cards.upcoming_meetings}</div>
                <div className="sublabel">next 30 days</div>
              </div>
              <Calendar className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Past 7 Days Reg.</div>
                <div className="value">{cards.registrations_last_7_days}</div>
                <div className="sublabel positive">week-on-week</div>
              </div>
              <TrendingUp className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Reports Generated</div>
                <div className="value">{cards.reports_last_month}</div>
                <div className="sublabel">last 30 days</div>
              </div>
              <FileText className="ico" />
            </div>
          </section>

          {/* NEW: Users & Joins snapshot (from /api/users/non-staff/) */}
          <section className="cards">
            <div className="card">
              <div>
                <div className="label">Non-staff Users (Total)</div>
                <div className="value">
                  {nonStaff.users.count_total.toLocaleString()}
                </div>
                <div className="sublabel">all time</div>
              </div>
              <Users className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">New Users (7 days)</div>
                <div className="value">{nonStaff.users.last_7_days}</div>
                <div className="sublabel">last 7 days</div>
              </div>
              <TrendingUp className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">New Users (30 days)</div>
                <div className="value">{nonStaff.users.last_30_days}</div>
                <div className="sublabel">last 30 days</div>
              </div>
              <TrendingUp className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Total Joins</div>
                <div className="value">
                  {nonStaff.joins.total.toLocaleString()}
                </div>
                <div className="sublabel">all time</div>
              </div>
              <ActivitySquare className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Joins (7 days)</div>
                <div className="value">{nonStaff.joins.last_7_days}</div>
                <div className="sublabel">last 7 days</div>
              </div>
              <ActivitySquare className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Joins (30 days)</div>
                <div className="value">{nonStaff.joins.last_30_days}</div>
                <div className="sublabel">last 30 days</div>
              </div>
              <ActivitySquare className="ico" />
            </div>

            <div className="card">
              <div>
                <div className="label">Live Events Now</div>
                <div className="value">{nonStaff.events.live_now}</div>
                <div className="sublabel">currently active</div>
              </div>
              <Calendar className="ico" />
            </div>
          </section>

          {/* Charts */}
          <section className="charts">
            <div className="panel">
              <div className="panel__title">Daily Registrations</div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563EB"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="panel__title">Registrations by Speciality</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    dataKey="count"
                    nameKey="specialty"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="legend">
                {pieData.map((row, i) => (
                  <div className="legend__item" key={row.specialty}>
                    <span
                      className="legend__dot"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="legend__txt">
                      {row.specialty} — {row.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
