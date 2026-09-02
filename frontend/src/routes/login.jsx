import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, Divider, Field } from "@/components/nex/AuthShell";
import { GoogleSignIn } from "@/components/nex/GoogleSignIn";
import { NexButton } from "@/components/nex/primitives";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — NEXVENTURE" },
      { name: "description", content: "Sign in to your NEXVENTURE account and continue building." },
      { property: "og:title", content: "Login — NEXVENTURE" },
      { property: "og:description", content: "Sign in to your NEXVENTURE account." },
    ],
  }),
  component: LoginPage,
});
function LoginPage() {
  const { signIn, signInWithGoogle, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  async function onSubmit(e) {
    e.preventDefault();
    clearError();
    const next = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await signIn(email, password);
      navigate({ to: "/dashboard" });
    } catch {
      // Error handled by AuthContext and displayed below
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
      title="Welcome back to the ecosystem."
      lead="Pick up where you left off — your investors, mentors and applications are waiting."
      bullets={["Live deal flow", "Mentor sessions", "Team applications"]}
    >
      <h1 className="text-2xl font-semibold">Welcome Back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Log in to your NEXVENTURE account.</p>

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
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) clearError();
          }}
        />
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) clearError();
          }}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" className="size-4 accent-[var(--brand)] rounded" /> Remember me
          </label>
          <span className="text-xs text-muted-foreground">Secure recovery coming soon</span>
        </div>

        <NexButton type="submit" className="w-full" size="md" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Authenticating...
            </span>
          ) : (
            "Login"
          )}
        </NexButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create Account
        </Link>
      </p>
    </AuthShell>
  );
}
