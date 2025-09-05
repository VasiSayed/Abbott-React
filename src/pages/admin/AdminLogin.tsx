import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, setTokens } from "../../services/api";

type Mode = "login" | "register";
type LoginWith = "username" | "email";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [loginWith, setLoginWith] = useState<LoginWith>("username");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // login form
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  // register form
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!loginId || !password) {
      setError("Please enter your credentials.");
      return;
    }

    setLoading(true);
    try {
      const payload =
        loginWith === "email"
          ? { email: loginId.trim(), password }
          : { username: loginId.trim(), password };

      const res = await authAPI.login(payload);
      setTokens(res.data);
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Login failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!regUsername || !regEmail || !regPassword) {
      setError("Please complete all required fields.");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Call your register endpoint (adjust if your backend differs)
      const res = await authAPI.register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        name: regName.trim() || undefined,
      });

      // If backend returns tokens, store and redirect; otherwise switch to login tab prefilled.
      if (res.data?.access || res.data?.refresh) {
        setTokens(res.data);
        navigate("/admin/dashboard", { replace: true });
      } else {
        setMode("login");
        setLoginWith("username");
        setLoginId(regUsername);
        setPassword("");
        setNotice("Registration successful. Please log in.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Registration failed.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "94vw",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 10px 24px rgba(2,6,23,.08)",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex" }}>
          <button
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              borderBottom:
                mode === "login"
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              background: "transparent",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              borderBottom:
                mode === "register"
                  ? "3px solid #2563eb"
                  : "3px solid transparent",
              background: "transparent",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Register
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {notice && (
            <div
              style={{
                background: "#ecfeff",
                border: "1px solid #a5f3fc",
                color: "#0e7490",
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {notice}
            </div>
          )}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin}>
              {/* Toggle username vs email */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="radio"
                    name="loginWith"
                    checked={loginWith === "username"}
                    onChange={() => setLoginWith("username")}
                  />
                  <span>Username</span>
                </label>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="radio"
                    name="loginWith"
                    checked={loginWith === "email"}
                    onChange={() => setLoginWith("email")}
                  />
                  <span>Email</span>
                </label>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  {loginWith === "email" ? "Email" : "Username"}
                </label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={
                    loginWith === "email" ? "you@example.com" : "admin"
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Full name (optional)
                </label>
                <input
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Jane Doe"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Username *
                </label>
                <input
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="admin"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Password *
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Confirm *
                  </label>
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
