import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AuthShell, Divider, Field } from "@/components/nex/AuthShell";
import { GoogleSignIn } from "@/components/nex/GoogleSignIn";
import { NexButton } from "@/components/nex/primitives";
import { RoleCards } from "@/components/nex/RoleCards";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — NEXVENTURE" },
      {
        name: "description",
        content: "Join NEXVENTURE as a founder, investor, mentor or student and start building.",
      },
      { property: "og:title", content: "Create your account — NEXVENTURE" },
      {
        property: "og:description",
        content: "Join the startup ecosystem built for every side of the table.",
      },
    ],
  }),
  component: SignupPage,
});
const strengthLabels = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
function scorePassword(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return pw.length === 0 ? 0 : s;
}
function SignupPage() {
  const { signUp, signInWithGoogle, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [role, setRole] = useState(null);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const score = useMemo(() => scorePassword(form.password), [form.password]);
  function set(key) {
    return (e) => {
      if (error) clearError();
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };
  }
  async function onSubmit(e) {
    e.preventDefault();
    clearError();
    const next = {};
    if (form.name.trim().length < 2) next.name = "Please enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.confirm !== form.password) next.confirm = "Passwords do not match.";
    if (!role) next.role = "Select the role that fits you best.";
    if (!terms) next.terms = "You must accept the terms to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await signUp({
        name: form.name.trim(),
        email: form.email,
        password: form.password,
        role: role,
      });
      navigate({ to: "/dashboard" });
    } catch {
      /* handled in AuthContext error state */
    }
  }
  async function onGoogleCredential(credential) {
    clearError();
    try {
      const nextUser = await signInWithGoogle(credential);
      navigate({ to: nextUser.onboardingComplete ? "/dashboard" : "/onboarding" });
    } catch {
      // Error handled by AuthContext and displayed below
    }
  }
  return (
    <AuthShell
      title="One account. Every side of the table."
      lead="Create your profile as a founder, investor, mentor or student and get matched instantly."
      bullets={["1,500+ startups", "850+ active investors", "600+ vetted mentors"]}
    >
      <h1 className="text-2xl font-semibold">Create Account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Start building with NEXVENTURE today.</p>

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 text-xs hover:underline opacity-80">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <GoogleSignIn onCredential={onGoogleCredential} disabled={isLoading} />
      </div>
      <Divider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Full Name"
          placeholder="Ada Lovelace"
          value={form.name}
          error={errors.name}
          onChange={set("name")}
        />
        <Field
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          error={errors.email}
          onChange={set("email")}
        />
        <div>
          <Field
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            error={errors.password}
            onChange={set("password")}
          />
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: i < score ? 1 : 0.18 }}
                  className="h-full flex-1 rounded-full"
                  style={{
                    background:
                      score <= 1
                        ? "var(--destructive)"
                        : score === 2
                          ? "var(--cyan)"
                          : "var(--success)",
                  }}
                />
              ))}
            </div>
            <span className="w-20 text-right text-[11px] font-semibold text-muted-foreground">
              {strengthLabels[score]}
            </span>
          </div>
        </div>
        <Field
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={form.confirm}
          error={errors.confirm}
          onChange={set("confirm")}
        />

        <div>
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            I am joining as
          </span>
          <div className="mt-2">
            <RoleCards
              value={role}
              onChange={(r) => {
                setRole(r);
                if (error) clearError();
              }}
            />
          </div>
          {errors.role ? <p className="mt-1.5 text-xs text-destructive">{errors.role}</p> : null}
        </div>

        <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--brand)] rounded"
          />
          <span>
            I accept the{" "}
            <a href="#" className="font-semibold text-primary hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.terms ? <p className="-mt-2 text-xs text-destructive">{errors.terms}</p> : null}

        <NexButton type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </NexButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
