import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { authEndpoints, authErrorKey } from "@/shared/api";
import { establishSession } from "@/shared/auth";
import { useLocaleStore, useThemeStore } from "@/shared/config";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined;

function loadGoogleIdentity(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error("GIS load failed")),
    );
  });
}

export function GoogleSignInButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const locale = useLocaleStore((state) => state.locale);

  // Loads the script and registers the callback once; does not depend on
  // resolvedTheme, so toggling the theme doesn't re-initialize GIS.
  useEffect(() => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            setError(null);
            try {
              const tokens = await authEndpoints.loginWithGoogle({
                id_token: credential,
              });
              await establishSession(tokens);
              navigate("/profile", { replace: true });
            } catch (err) {
              setError(t(authErrorKey(err)));
            }
          },
        });
        setReady(true);
      })
      .catch(() => setError(t("auth.errors.generic")));
    return () => {
      cancelled = true;
    };
  }, [navigate, t]);

  // Re-renders Google's own button to match the resolved theme and locale,
  // without touching initialize().
  useEffect(() => {
    if (!ready || !window.google || !containerRef.current) return;
    containerRef.current.replaceChildren();
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: resolvedTheme === "dark" ? "filled_black" : "outline",
      size: "large",
      shape: "pill",
      locale,
      width: containerRef.current.offsetWidth || 320,
    });
  }, [ready, resolvedTheme, locale]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="w-full" />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
