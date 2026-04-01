import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { CheckCircle2, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import useAuth from "../../hooks/useAuth";

const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, loginWithGoogle } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      setSubmitted(true);
      navigate("/");
    } catch (error) {
      const responseData = error?.response?.data;
      const validationMessage = Array.isArray(responseData?.errors)
        ? responseData.errors.find((item) => item?.msg)?.msg
        : null;
      const isNetworkError = !error?.response && error?.message === "Network Error";
      const message =
        (isNetworkError
          ? "Unable to reach the server. Please check that API is running and API base URL is configured correctly."
          : null) ||
        validationMessage ||
        responseData?.message ||
        error?.message ||
        "Registration failed. Please try again.";
      toast.error(message);
    }
  };

  const handleGoogleSignIn = useCallback(
    async (idToken) => {
      await loginWithGoogle(idToken);
      navigate("/");
    },
    [loginWithGoogle, navigate]
  );

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white p-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            <Sparkles size={16} />
            Splitora
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight">Split smarter, settle faster</h1>
          <p className="mt-4 text-primary-100 text-lg max-w-md">
            Create your account and start tracking expenses with your friends, teams, and trips in minutes.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <Users className="mt-0.5" size={18} />
            <p>Create unlimited groups and invite members effortlessly.</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <Wallet className="mt-0.5" size={18} />
            <p>Track who paid, who owes, and simplify debts automatically.</p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <ShieldCheck className="mt-0.5" size={18} />
            <p>Secure account flow designed for fast and reliable usage.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-surface-100 p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl bg-surface-50 p-6 sm:p-8 shadow-card border border-surface-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-surface-900">Create your account</h2>
            <p className="mt-1 text-sm text-surface-600">Join Splitora and start splitting with confidence.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full name"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" loading={isSubmitting} fullWidth>
              Create account
            </Button>
          </form>

          <GoogleSignInButton onCredential={handleGoogleSignIn} />

          {submitted ? (
            <p className="mt-4 text-sm text-success-600 inline-flex items-center gap-1">
              <CheckCircle2 size={16} /> Account created successfully.
            </p>
          ) : null}

          <p className="mt-5 text-center text-sm text-surface-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
