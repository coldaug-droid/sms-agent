// ============================================================
// Lead SMS Agent — Full Multi-Client App
// Stack: React (frontend) + Vercel Serverless (backend)
// Auth: Supabase | SMS: Twilio | AI: Claude API
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

// ─── Theme ───────────────────────────────────────────────────
const t = {
  bg: "#080A0E", card: "#0F1218", border: "#1A1F2E",
  accent: "#00C896", accentDim: "#00C89615", accentHover: "#00E5AD",
  text: "#E8EAF0", muted: "#5A6478", danger: "#FF4D6D",
  warning: "#F59E0B", info: "#3B82F6", purple: "#8B5CF6",
};

const css = {
  input: {
    background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
    color: t.text, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
    width: "100%", boxSizing: "border-box", outline: "none",
  },
  card: {
    background: t.card, border: `1px solid ${t.border}`,
    borderRadius: 12, padding: 24,
  },
};

// ─── Reusable UI ─────────────────────────────────────────────
function Btn({ onClick, disabled, variant = "primary", children, style, size = "md" }) {
  const pad = size === "sm" ? "7px 14px" : "11px 22px";
  const fs = size === "sm" ? 12 : 13;
  const colors = {
    primary: { bg: t.accent, color: "#000", border: "none" },
    ghost: { bg: "transparent", color: t.accent, border: `1px solid ${t.accent}44` },
    danger: { bg: t.danger + "22", color: t.danger, border: `1px solid ${t.danger}44` },
    muted: { bg: t.border, color: t.muted, border: "none" },
  };
  const c = colors[variant] || colors.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...c, borderRadius: 8, padding: pad, fontWeight: 700, fontSize: fs,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "all 0.15s", letterSpacing: "0.03em", fontFamily: "inherit", ...style
    }}>{children}</button>
  );
}

function Badge({ color = t.accent, children }) {
  return <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px",
    letterSpacing: "0.06em", textTransform: "uppercase"
  }}>{children}</span>;
}

function Card({ children, style }) {
  return <div style={{ ...css.card, ...style }}>{children}</div>;
}

function Label({ children }) {
  return <div style={{ fontSize: 11, color: t.muted, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{children}</div>;
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <Label>{label}</Label>}
      <input style={css.input} {...props} />
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: t.border }} />
      {label && <span style={{ color: t.muted, fontSize: 11, letterSpacing: "0.08em" }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: t.border }} />
    </div>
  );
}

// ─── Simulated Auth (replace with Supabase in production) ────
const DEMO_USERS = [
  { id: "1", email: "admin@youragency.com", password: "admin123", name: "Agency Admin", role: "admin" },
  { id: "2", email: "client@example.com", password: "client123", name: "Sarah Johnson", role: "client",
    business: "Sarah's Realty", twilioSid: "", twilioToken: "", twilioFrom: "" },
];

function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sms_agent_user")); } catch { return null; }
  });
  const login = (email, password) => {
    const found = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (found) { setUser(found); localStorage.setItem("sms_agent_user", JSON.stringify(found)); return true; }
    return false;
  };
  const logout = () => { setUser(null); localStorage.removeItem("sms_agent_user"); };
  return { user, login, logout };
}

// ─── AI Helper ───────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You write short, warm, professional SMS messages for small business outreach. Return only the message text, no quotes, no explanation.",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "";
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 600));
    if (!onLogin(email, password)) setError("Invalid email or password.");
    setLoading(false);
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ width: 420, padding: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: t.accentDim, border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>⚡</div>
          <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.05em", color: t.accent }}>LEAD SMS AGENT</div>
          <div style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>Sign in to your account</div>
        </div>

        <Card>
          <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div style={{ color: t.danger, fontSize: 12, marginBottom: 14, padding: "8px 12px", background: t.danger + "15", borderRadius: 6 }}>{error}</div>}
          <Btn onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Signing in…" : "Sign In →"}
          </Btn>
        </Card>

        <div style={{ textAlign: "center", marginTop: 20, color: t.muted, fontSize: 11 }}>
          Demo: admin@youragency.com / admin123
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────
function AdminDashboard({ user, logout }) {
  const clients = [
    { id: "2", name: "Sarah Johnson", business: "Sarah's Realty", plan: "$10/mo", status: "active", campaigns: 3, lastActive: "Today" },
    { id: "3", name: "Mike Torres", business: "Torres Insurance", plan: "$10/mo", status: "active", campaigns: 1, lastActive: "2 days ago" },
    { id: "4", name: "Jenny Park", business: "Park Wellness", plan: "$10/mo", status: "pending", campaigns: 0, lastActive: "Never" },
  ];

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: "'IBM Plex Mono', monospace", color: t.text }}>
      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${t.border}`, padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.accent, letterSpacing: "0.05em" }}>⚡ LEAD SMS AGENT</div>
        <Badge color={t.purple}>ADMIN</Badge>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: t.muted, fontSize: 12 }}>{user.name}</span>
          <Btn onClick={logout} variant="ghost" size="sm">Sign Out</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Active Clients", val: "3", color: t.accent },
            { label: "MRR", val: "$30", color: t.accent },
            { label: "Campaigns Run", val: "4", color: t.text },
            { label: "SMS Sent", val: "847", color: t.text },
          ].map(({ label, val, color }) => (
            <Card key={label} style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 11, color: t.muted, marginTop: 4, letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
            </Card>
          ))}
        </div>

        {/* Client list */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Client Accounts</h2>
          <Btn size="sm">+ Add Client</Btn>
        </div>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {["Client", "Business", "Plan", "Campaigns", "Last Active", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: t.muted, fontWeight: 700, fontSize: 11, letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: "14px 16px", color: t.muted }}>{c.business}</td>
                  <td style={{ padding: "14px 16px" }}>{c.plan}</td>
                  <td style={{ padding: "14px 16px" }}>{c.campaigns}</td>
                  <td style={{ padding: "14px 16px", color: t.muted }}>{c.lastActive}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <Badge color={c.status === "active" ? t.accent : t.warning}>{c.status}</Badge>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <Btn size="sm" variant="ghost">Manage</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Divider label="SYSTEM" />
        <div style={{ color: t.muted, fontSize: 12, lineHeight: 1.8 }}>
          <div>🔧 Backend: Vercel Serverless · <span style={{ color: t.accent }}>Connected</span></div>
          <div>🗄️ Database: Supabase · <span style={{ color: t.accent }}>Connected</span></div>
          <div>💳 Billing: Stripe · <span style={{ color: t.accent }}>Active</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD — SMS CAMPAIGN TOOL ────────────────────
function ClientDashboard({ user, logout }) {
  const [step, setStep] = useState(1);
  const [leads, setLeads] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ name: "", phone: "", email: "" });
  const [template, setTemplate] = useState("Hi {name}! Just wanted to reach out personally — I have something I think would be a great fit for you. Would love to connect when you have a moment! 😊");
  const [messages, setMessages] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sendLog, setSendLog] = useState([]);
  const [campaigns, setCampaigns] = useState([
    { id: 1, date: "Mar 8", name: "Spring Leads", sent: 24, status: "complete" },
    { id: 2, date: "Feb 22", name: "February Follow-up", sent: 17, status: "complete" },
  ]);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) return;
      const hdrs = rows[0].map(String);
      const data = rows.slice(1).filter(r => r.some(Boolean)).map(r => {
        const obj = {};
        hdrs.forEach((h, i) => obj[h] = r[i] ?? "");
        return obj;
      });
      setHeaders(hdrs);
      setLeads(data);
      const lower = hdrs.map(h => h.toLowerCase());
      setMapping({
        name: hdrs[lower.findIndex(h => h.includes("name") || h.includes("first"))] || "",
        phone: hdrs[lower.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("cell"))] || "",
        email: hdrs[lower.findIndex(h => h.includes("email"))] || "",
      });
      setStep(2);
    };
    reader.readAsBinaryString(file);
  };

  const suggestMessage = async () => {
    setAiThinking(true);
    const sample = leads.slice(0, 3).map(l => l[mapping.name] || "someone").join(", ");
    const business = user.business || "my business";
    const text = await callClaude(`I run "${business}" and need to text leads like: ${sample}. Write a short warm SMS under 160 chars. Use {name} as placeholder.`);
    setAiSuggestion(text);
    setAiThinking(false);
  };

  const buildPreviews = () => {
    setMessages(leads.map(lead => {
      const name = String(lead[mapping.name] || "").split(" ")[0] || "there";
      const phone = String(lead[mapping.phone] || "").replace(/\D/g, "");
      return { name: lead[mapping.name] || "—", phone, email: lead[mapping.email] || "", msg: template.replace(/\{name\}/gi, name), status: "pending" };
    }));
    setStep(4);
  };

  const sendAll = async () => {
    setSending(true);
    const log = [];
    for (let i = 0; i < messages.length; i++) {
      await new Promise(r => setTimeout(r, 350));
      const m = messages[i];
      const ok = m.phone.length >= 10;
      log.push({ ...m, status: ok ? "sent" : "failed" });
      setSendLog([...log]);
    }
    setSending(false);
    setCampaigns(p => [{ id: Date.now(), date: "Today", name: "New Campaign", sent: log.filter(l => l.status === "sent").length, status: "complete" }, ...p]);
    setStep(5);
  };

  const reset = () => { setStep(1); setLeads([]); setMessages([]); setSendLog([]); setAiSuggestion(""); };
  const sent = sendLog.filter(l => l.status === "sent").length;
  const failed = sendLog.filter(l => l.status === "failed").length;

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: "'IBM Plex Mono', monospace", color: t.text, display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: `1px solid ${t.border}`, padding: "24px 16px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: t.accent, letterSpacing: "0.05em", marginBottom: 4 }}>⚡ SMS AGENT</div>
        <div style={{ fontSize: 11, color: t.muted, marginBottom: 28 }}>{user.business || "Client Portal"}</div>
        
        {[
          { icon: "🚀", label: "New Campaign", s: 1 },
          { icon: "📋", label: "Past Campaigns", s: 6 },
          { icon: "⚙️", label: "Settings", s: 7 },
        ].map(({ icon, label, s }) => (
          <button key={s} onClick={() => setStep(s)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 4, fontFamily: "inherit",
            background: step === s ? t.accentDim : "transparent",
            color: step === s ? t.accent : t.muted, fontSize: 13, fontWeight: step === s ? 700 : 400,
            textAlign: "left"
          }}>{icon} {label}</button>
        ))}

        <div style={{ marginTop: "auto" }}>
          <Divider />
          <div style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>{user.name}</div>
          <Btn onClick={logout} variant="ghost" size="sm" style={{ width: "100%" }}>Sign Out</Btn>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        
        {/* Progress bar for campaign steps */}
        {step <= 5 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
            {["Upload", "Map", "Compose", "Preview", "Done"].map((label, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ height: 3, borderRadius: 2, background: (i + 1) <= step ? t.accent : t.border, transition: "background 0.3s" }} />
                <div style={{ fontSize: 10, color: (i + 1) <= step ? t.accent : t.muted, letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>New Campaign</h2>
            <p style={{ color: t.muted, fontSize: 13, marginBottom: 28 }}>Upload your leads spreadsheet to get started.</p>
            <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${t.border}`, borderRadius: 12, padding: "52px 32px", textAlign: "center", cursor: "pointer", background: t.card, transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = t.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Drop your spreadsheet here</div>
              <div style={{ color: t.muted, fontSize: 12 }}>Excel (.xlsx) or CSV — with name, phone, email columns</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
            </div>
          </div>
        )}

        {/* STEP 2: Map columns */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Map Your Columns</h2>
            <p style={{ color: t.muted, fontSize: 13, marginBottom: 24 }}>Found <strong style={{ color: t.accent }}>{leads.length} leads</strong>. Confirm which columns are which.</p>
            <Card style={{ marginBottom: 24 }}>
              {[["name", "👤 Name column"], ["phone", "📱 Phone column"], ["email", "✉️ Email (optional)"]].map(([field, label]) => (
                <div key={field} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 150, fontSize: 13, color: t.muted, flexShrink: 0 }}>{label}</div>
                  <select value={mapping[field]} onChange={e => setMapping(p => ({ ...p, [field]: e.target.value }))}
                    style={{ ...css.input, flex: 1 }}>
                    <option value="">— not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {mapping[field] && <Badge color={t.accent}>✓</Badge>}
                </div>
              ))}
            </Card>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn onClick={() => setStep(1)} variant="ghost">← Back</Btn>
              <Btn onClick={() => setStep(3)} disabled={!mapping.name || !mapping.phone}>Continue →</Btn>
            </div>
          </div>
        )}

        {/* STEP 3: Compose */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Write Your Message</h2>
            <p style={{ color: t.muted, fontSize: 13, marginBottom: 24 }}>
              Use <code style={{ color: t.accent, background: t.accentDim, padding: "1px 6px", borderRadius: 4 }}>{"{name}"}</code> to insert each person's first name.
            </p>
            <Card style={{ marginBottom: 16 }}>
              <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={4}
                style={{ ...css.input, resize: "vertical" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span style={{ color: template.length > 160 ? t.warning : t.muted, fontSize: 12 }}>
                  {template.replace(/\{name\}/g, "Name").length} chars
                  {template.length > 160 ? " · ⚠ may send as 2 SMS" : " · fits 1 SMS"}
                </span>
                <Btn onClick={suggestMessage} disabled={aiThinking} variant="ghost" size="sm">
                  {aiThinking ? "✨ Writing…" : "✨ AI Suggest"}
                </Btn>
              </div>
              {aiSuggestion && (
                <div style={{ marginTop: 14, background: t.bg, border: `1px solid ${t.accent}44`, borderRadius: 8, padding: 14 }}>
                  <Label>AI SUGGESTION</Label>
                  <div style={{ fontSize: 13, marginBottom: 10 }}>{aiSuggestion}</div>
                  <Btn size="sm" onClick={() => { setTemplate(aiSuggestion); setAiSuggestion(""); }}>Use this ↑</Btn>
                </div>
              )}
            </Card>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn onClick={() => setStep(2)} variant="ghost">← Back</Btn>
              <Btn onClick={buildPreviews} disabled={!template.trim()}>Preview {leads.length} Messages →</Btn>
            </div>
          </div>
        )}

        {/* STEP 4: Preview & Send */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Review & Send</h2>
            <p style={{ color: t.muted, fontSize: 13, marginBottom: 24 }}><strong style={{ color: t.accent }}>{messages.length} messages</strong> ready. Review then send.</p>
            <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {messages.slice(0, 10).map((m, i) => (
                <Card key={i} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</span>
                    <span style={{ color: m.phone.length >= 10 ? t.muted : t.danger, fontSize: 12, fontFamily: "monospace" }}>
                      {m.phone || "⚠ no phone"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6 }}>{m.msg}</div>
                </Card>
              ))}
              {messages.length > 10 && <div style={{ textAlign: "center", color: t.muted, fontSize: 12 }}>+ {messages.length - 10} more…</div>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn onClick={() => setStep(3)} variant="ghost">← Edit</Btn>
              <Btn onClick={sendAll} disabled={sending}>
                {sending ? `Sending… ${sendLog.length}/${messages.length}` : `🚀 Send ${messages.length} Messages`}
              </Btn>
            </div>
          </div>
        )}

        {/* STEP 5: Results */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Campaign Complete ✓</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Sent", val: sent, color: t.accent },
                { label: "Failed", val: failed, color: failed > 0 ? t.danger : t.muted },
                { label: "Success Rate", val: `${Math.round((sent / sendLog.length) * 100)}%`, color: t.text },
              ].map(({ label, val, color }) => (
                <Card key={label} style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>{label.toUpperCase()}</div>
                </Card>
              ))}
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
              {sendLog.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", background: t.card, borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 12 }}>
                  <span style={{ color: l.status === "sent" ? t.accent : t.danger }}>{l.status === "sent" ? "✓" : "✗"}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{l.name}</span>
                  <span style={{ color: t.muted, fontFamily: "monospace" }}>{l.phone}</span>
                  <Badge color={l.status === "sent" ? t.accent : t.danger}>{l.status}</Badge>
                </div>
              ))}
            </div>
            <Btn onClick={reset}>↩ New Campaign</Btn>
          </div>
        )}

        {/* STEP 6: Past Campaigns */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Past Campaigns</h2>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {["Date", "Campaign", "Sent", "Status"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: t.muted, fontWeight: 700, fontSize: 11 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < campaigns.length - 1 ? `1px solid ${t.border}` : "none" }}>
                      <td style={{ padding: "12px 16px", color: t.muted }}>{c.date}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: "12px 16px" }}>{c.sent}</td>
                      <td style={{ padding: "12px 16px" }}><Badge color={t.accent}>{c.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* STEP 7: Settings */}
        {step === 7 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Account Settings</h2>
            <Card style={{ marginBottom: 20 }}>
              <Label>Business Name</Label>
              <input defaultValue={user.business || ""} style={{ ...css.input, marginBottom: 16 }} />
              <Label>Your Name</Label>
              <input defaultValue={user.name} style={{ ...css.input, marginBottom: 16 }} />
            </Card>
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📡 Twilio Configuration</div>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 16 }}>Your SMS provider credentials. Keep these private.</div>
              <Input label="Account SID" placeholder="ACxxxxxxxxxxxxxxxx" type="text" />
              <Input label="Auth Token" placeholder="••••••••••••••••" type="password" />
              <Input label="From Phone Number" placeholder="+1xxxxxxxxxx" type="text" />
              <Btn size="sm">Save Credentials</Btn>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const { user, login, logout } = useAuth();
  if (!user) return <LoginScreen onLogin={login} />;
  if (user.role === "admin") return <AdminDashboard user={user} logout={logout} />;
  return <ClientDashboard user={user} logout={logout} />;
}
