import React, { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * Lightweight toast for the Balance Log feature.
 *
 * Uses class-based styling from the host design system (`.toast`, `.toast--err`,
 * `.toast--warn`) so it picks up the same jade-accent left-bar treatment as the
 * rest of the app. Animation is the keyframe `toastIn` defined in styles.css.
 */

type ToastKind = "info" | "success" | "error";
type ToastMsg = { id: number; text: string; kind: ToastKind };

type Ctx = {
  show: (text: string, kind?: ToastKind, ms?: number) => void;
};

const ToastContext = createContext<Ctx | null>(null);

const KIND_TO_CLASS: Record<ToastKind, string> = {
  info:    "toast",
  success: "toast",
  error:   "toast toast--err"
};

const KIND_TO_GLYPH: Record<ToastKind, string> = {
  info:    "·",
  success: "✓",
  error:   "!"
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback((text: string, kind: ToastKind = "info", ms = 1800) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast({ id: Date.now(), text, kind });
    if (kind !== "error") {
      timerRef.current = window.setTimeout(() => setToast(null), ms);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          // The .toast class lives in src/styles.css and uses the new design
          // tokens (bg-2 surface, hairline border, jade left-bar). Position is
          // fixed bottom-right so the toast clears the BL drawer if it's open.
          role="status"
          aria-live="polite"
          onClick={() => setToast(null)}
          className={KIND_TO_CLASS[toast.kind]}
          // The animation re-runs because we re-render with a new key when the
          // toast id changes — same toast id = no re-trigger.
          key={toast.id}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            cursor: "pointer",
            maxWidth: 360
          }}
        >
          <span className="glyph" aria-hidden="true" style={{ fontWeight: 700 }}>
            {KIND_TO_GLYPH[toast.kind]}
          </span>
          <span>{toast.text}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  // Safe fallback: if a component using useToast renders outside the provider
  // (e.g. a test), fall back to console so behavior remains observable.
  return ctx ?? { show: (text) => { console.info("[bl-toast]", text); } };
}
