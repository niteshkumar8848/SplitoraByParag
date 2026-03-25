import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import useAuth from "../../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef(null);
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      await login(values);
      navigate("/");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    }
  };

  const handleGoogleResponse = useCallback(
    async (response) => {
      const idToken = response?.credential;
      if (!idToken) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }

      try {
        await loginWithGoogle(idToken);
        navigate("/");
      } catch (error) {
        const message = error?.response?.data?.message || "Google login failed. Please try again.";
        toast.error(message);
      }
    },
    [loginWithGoogle, navigate]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return;
    }

    let isUnmounted = false;
    const existingScript = document.querySelector('script[data-google-gsi="true"]');

    const renderGoogleButton = () => {
      if (isUnmounted || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
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
  }, [GOOGLE_CLIENT_ID, handleGoogleResponse]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-12 text-white lg:flex">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            <Sparkles size={16} />
            Splitora
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight">
            Split smarter, settle faster
          </h1>
          <p className="mt-4 max-w-md text-lg text-primary-100">
            Track group expenses, simplify debts instantly, and keep every
            trip and team plan stress-free.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <Wallet className="mt-0.5" size={18} />
            <p>Auto-split with equal, percentage, and custom options.</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <ShieldCheck className="mt-0.5" size={18} />
            <p>Secure token-based auth and reliable activity tracking.</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <CheckCircle2 className="mt-0.5" size={18} />
            <p>Settle up quickly with smart debt simplification.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-surface-100 p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-surface-50 p-6 shadow-card sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-surface-900">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-surface-600">
              Sign in to continue managing your groups.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-surface-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={clsx(
                    "h-11 w-full rounded-xl border bg-surface-50 px-3 pr-10 text-surface-900 placeholder:text-surface-400 transition focus:outline-none focus:ring-2",
                    errors.password
                      ? "border-danger-400 focus:ring-danger-200"
                      : "border-surface-300 focus:ring-primary-200"
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? (
                <p className="mt-1.5 text-sm text-danger-600">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" loading={isSubmitting} fullWidth>
              Log in
            </Button>
          </form>

          {GOOGLE_CLIENT_ID ? (
            <div className="mt-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-surface-200" />
                <span className="text-xs uppercase tracking-wide text-surface-500">or</span>
                <div className="h-px flex-1 bg-surface-200" />
              </div>
              <div ref={googleButtonRef} className="flex justify-center" />
            </div>
          ) : null}

          <p className="mt-5 text-center text-sm text-surface-600">
            New to Splitora?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
