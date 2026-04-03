import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

const normalizeGoogleClientId = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withoutKey = raw.replace(/^VITE_GOOGLE_CLIENT_ID\s*=\s*/i, "");
  return withoutKey.replace(/^["']|["']$/g, "").trim();
};

export default function GoogleSignInButton({ onCredential }) {
  const buttonRef = useRef(null);
  const googleClientId = normalizeGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (!googleClientId || !buttonRef.current) {
      return;
    }

    let isUnmounted = false;
    const existingScript = document.querySelector('script[data-google-gsi="true"]');

    const renderGoogleButton = () => {
      if (isUnmounted || !window.google?.accounts?.id || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          const idToken = response?.credential;
          if (!idToken) {
            toast.error("Google sign-in failed. Please try again.");
            return;
          }

          try {
            await onCredential(idToken);
          } catch (error) {
            const message =
              error?.response?.data?.message || "Google sign-in failed. Please try again.";
            toast.error(message);
          }
        },
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        isUnmounted = true;
      };
    }

    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
      return () => {
        isUnmounted = true;
        existingScript.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.onload = renderGoogleButton;
    document.head.appendChild(script);

    return () => {
      isUnmounted = true;
    };
  }, [googleClientId, onCredential]);

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-200" />
        <span className="text-xs uppercase tracking-wide text-surface-500">or</span>
        <div className="h-px flex-1 bg-surface-200" />
      </div>
      {googleClientId ? (
        <div ref={buttonRef} className="flex justify-center" />
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="mx-auto flex h-11 w-full max-w-[360px] cursor-not-allowed items-center justify-center rounded-full border border-surface-300 bg-surface-100 px-4 text-sm font-medium text-surface-500"
          >
            Continue with Google
          </button>
          <p className="text-center text-xs text-surface-500">
            Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code> and restart frontend.
          </p>
        </div>
      )}
    </div>
  );
}
