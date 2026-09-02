import { useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiAlertTriangle, FiExternalLink } from "react-icons/fi";

const GOOGLE_SCRIPT_ID = "google-identity-services";

export function GoogleSignIn({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.accounts?.id));
  const [oauthError, setOauthError] = useState(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || scriptReady) return undefined;

    let script = document.getElementById(GOOGLE_SCRIPT_ID);
    const handleLoad = () => setScriptReady(true);
    const handleError = () =>
      setOauthError("Failed to load Google sign-in script. Check your network connection.");

    if (!script) {
      script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    return () => {
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [clientId, scriptReady]);

  useEffect(() => {
    if (!clientId || !scriptReady || !containerRef.current || disabled) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            callbackRef.current(response.credential);
          } else {
            setOauthError(
              "Google did not return a valid credential. Please use email/password login.",
            );
          }
        },
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
        error_callback: (error) => {
          // Handles popup_closed_by_user, access_denied, unknown, etc.
          if (error?.type !== "popup_closed_by_user") {
            const isOriginError = error?.type === "unknown" || error?.message?.includes("origin");
            if (isOriginError) {
              setOauthError(
                "Google OAuth requires this domain to be authorized. " +
                  "Add http://localhost:8080 to Authorized JavaScript origins in Google Cloud Console.",
              );
            } else {
              setOauthError(`Google sign-in failed: ${error?.type ?? "unknown error"}`);
            }
          }
        },
      });
      containerRef.current.replaceChildren();
      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: Math.min(360, containerRef.current.clientWidth || 360),
      });
    } catch (err) {
      setOauthError(
        err?.message?.includes("origin")
          ? "Google OAuth: add http://localhost:8080 to Authorized JavaScript origins in Google Cloud Console to enable Google sign-in."
          : `Google sign-in initialization failed: ${err.message}`,
      );
    }
  }, [clientId, disabled, scriptReady]);

  // No client ID configured at all
  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs leading-5 text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <FcGoogle className="size-4" /> Google sign-in needs configuration
        </div>
        Add <code className="mx-1 rounded bg-secondary px-1 py-0.5">VITE_GOOGLE_CLIENT_ID</code> to{" "}
        <code className="rounded bg-secondary px-1 py-0.5">frontend/.env</code> and{" "}
        <code className="mx-1 rounded bg-secondary px-1 py-0.5">GOOGLE_CLIENT_ID</code> to{" "}
        <code className="rounded bg-secondary px-1 py-0.5">backend/.env</code>.
      </div>
    );
  }

  // OAuth error (origin not authorized, network, etc.)
  if (oauthError) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 text-xs leading-5 text-muted-foreground space-y-2">
        <div className="flex items-start gap-2 font-semibold text-amber-400">
          <FiAlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
          <span>Google sign-in unavailable</span>
        </div>
        <p>{oauthError}</p>
        {oauthError.includes("Authorized JavaScript origins") && (
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
          >
            Open Google Cloud Console <FiExternalLink className="size-3" />
          </a>
        )}
        <p className="text-muted-foreground/80 font-normal">
          You can still sign in with your email and password below.
        </p>
        <button
          onClick={() => setOauthError(null)}
          className="text-primary hover:underline font-medium"
        >
          Try Google again
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label="Continue with Google"
      className={disabled ? "pointer-events-none min-h-11 opacity-60" : "min-h-11"}
    />
  );
}
