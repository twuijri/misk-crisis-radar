import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import App from "./app.jsx";
import { getCode, setCode, clearCode, verifyCode } from "./api.js";

/* ============================================================
   Login gate for the Voice of Beneficiaries Library.
   The whole system is private: nothing loads until the visitor
   enters the control-panel access code. The code is shared with
   the Crisis Radar (sessionStorage "crg_code"), so logging into
   either system unlocks both on this device/session.
   ============================================================ */

const FONT_CSS = `
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:600;font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-arabic-600.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:400;font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-arabic-400.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFF}`;

const C = { green: "#0F3D30", greenDeep: "#0A2C22", lime: "#C4D600", teal: "#2DA188", tealSoft: "#7FCBB8", mist: "#F3F6F2", line: "#E1E8E2", muted: "#5E6E66", ink: "#13211C" };

function LoginGate({ onAuthed }) {
  const [code, setCodeVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [checking, setChecking] = useState(true);

  // If a code is already stored (e.g. logged into the radar), verify it silently.
  useEffect(() => {
    const existing = getCode();
    if (!existing) { setChecking(false); return; }
    verifyCode(existing).then((ok) => {
      if (ok) onAuthed();
      else { clearCode(); setChecking(false); }
    }).catch(() => setChecking(false));
  }, []);

  const submit = async (e) => {
    if (e) e.preventDefault();
    setBusy(true); setErr(false);
    try {
      const ok = await verifyCode(code);
      if (!ok) { setErr(true); setBusy(false); return; }
      setCode(code);
      onAuthed();
    } catch (x) {
      setErr(true); setBusy(false);
    }
  };

  const wrap = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.green, fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", padding: 20 };

  if (checking) {
    return <div style={wrap}><Loader2 size={28} style={{ color: C.lime, animation: "vobl-spin 1s linear infinite" }} /><style>{FONT_CSS}{"@keyframes vobl-spin{to{transform:rotate(360deg)}}"}</style></div>;
  }

  return (
    <div dir="rtl" style={wrap}>
      <style>{FONT_CSS}{"@keyframes vobl-spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ width: 380, maxWidth: "92vw", background: "#fff", borderRadius: 16, padding: 30, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: C.mist, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <KeyRound size={26} style={{ color: C.teal }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.green, textAlign: "center" }}>مكتبة أصوات المستفيدين</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, textAlign: "center" }}>هذه المنطقة خاصة — أدخل رمز لوحة التحكم للمتابعة</div>
        </div>
        <form onSubmit={submit}>
          <input autoFocus type="password" value={code} onChange={(e) => setCodeVal(e.target.value)}
            placeholder="رمز الدخول"
            style={{ width: "100%", padding: "12px 14px", border: `1px solid ${err ? "#D32F2F" : C.line}`, borderRadius: 11, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none", boxSizing: "border-box" }} />
          {err && <div style={{ fontSize: 12, color: "#D32F2F", marginTop: 8 }}>رمز غير صحيح، حاول مرة أخرى.</div>}
          <button type="submit" disabled={busy || !code}
            style={{ width: "100%", marginTop: 16, padding: "12px", background: C.green, color: "#fff", border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: busy || !code ? "default" : "pointer", opacity: busy || !code ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {busy && <Loader2 size={16} style={{ animation: "vobl-spin 1s linear infinite" }} />} دخول
          </button>
        </form>
        <a href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, fontSize: 12.5, color: C.muted, textDecoration: "none" }}>
          <ArrowLeft size={14} style={{ transform: "scaleX(-1)" }} /> العودة إلى رادار الأزمات
        </a>
      </div>
    </div>
  );
}

function Root() {
  const [authed, setAuthed] = useState(false);

  const logout = () => { clearCode(); setAuthed(false); };
  // Called by the app when a request returns 401 mid-session.
  const authExpired = () => { clearCode(); setAuthed(false); };

  if (!authed) return <LoginGate onAuthed={() => setAuthed(true)} />;
  return (
    <div style={{ minHeight: "100vh", background: C.mist }}>
      <App onLogout={logout} onAuthExpired={authExpired} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
