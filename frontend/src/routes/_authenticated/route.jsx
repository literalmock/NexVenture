import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});
function AuthenticatedLayout() {
  const { ready, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/login", replace: true });
    if (
      ready &&
      isAuthenticated &&
      user?.onboardingComplete === false &&
      pathname !== "/onboarding"
    ) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [ready, isAuthenticated, navigate, pathname, user?.onboardingComplete]);
  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }
  return <Outlet />;
}
