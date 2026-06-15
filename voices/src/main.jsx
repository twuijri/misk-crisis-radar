import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, KeyRound, X } from "lucide-react";
import App from "./app.jsx";
import { getCode, setCode, clearCode, verifyCode } from "./api.js";

/* ============================================================
   Voice of Beneficiaries Library — entry point.
   The library follows the same access model as the Crisis Radar:
   anyone can VIEW the data, but adding/editing and the settings are
   unlocked only after entering the control-panel access code. The
   code is shared with the radar (sessionStorage "crg_code"), so
   logging into either system unlocks editing on both.
   ============================================================ */

const FONT_CSS = `
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:600;font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-arabic-600.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:400;font-display:swap;src:url('/assets/fonts/ibm-plex-sans-arabic-arabic-400.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFF}`;

const C = { green: "#1B7D5C", greenDeep: "#146145", lime: "#C4D600", teal: "#2DB89F", tealSoft: "#9FD9CB", mist: "#F5F9F8", line: "#E8EDEB", muted: "#5A5A5A", ink: "#1B1B1B" };

/* Editor sign-in — a modal overlay (not a wall). The dashboard is already
   visible behind it; this only unlocks editing. */
function EditorLogin({ onClose, onAuthed }) {
  const [code, setCodeVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

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

  const wrap = { position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,30,24,0.55)", fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif", padding: 20 };

  return (
    <div dir="rtl" style={wrap} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{FONT_CSS}{"@keyframes vobl-spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ width: 380, maxWidth: "92vw", background: "#fff", borderRadius: 16, padding: 30, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}>
        <button onClick={onClose} aria-label="close" style={{ position: "absolute", top: 14, insetInlineStart: 14, border: "none", background: "transparent", cursor: "pointer", color: C.muted }}><X size={18} /></button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: C.mist, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <KeyRound size={26} style={{ color: C.teal }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green, textAlign: "center" }}>دخول المحرّر</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, textAlign: "center" }}>أدخل رمز لوحة التحكم لتفعيل التعديل والإعدادات</div>
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
      </div>
    </div>
  );
}

function Root() {
  const [editMode, setEditMode] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Silently restore editor mode if a valid code is already stored (e.g. the
  // user logged into the radar in the same session).
  useEffect(() => {
    const existing = getCode();
    if (!existing) return;
    verifyCode(existing).then((ok) => { if (ok) setEditMode(true); else clearCode(); }).catch(() => {});
  }, []);

  const onLogout = () => { clearCode(); setEditMode(false); };
  // Called when a write returns 401 mid-session — the code is no longer valid.
  const onAuthExpired = () => { clearCode(); setEditMode(false); };

  return (
    <div style={{ minHeight: "100vh", background: C.mist }}>
      <App canEdit={editMode} onRequestEdit={() => setLoginOpen(true)} onLogout={onLogout} onAuthExpired={onAuthExpired} />
      {loginOpen && <EditorLogin onClose={() => setLoginOpen(false)} onAuthed={() => { setEditMode(true); setLoginOpen(false); }} />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
