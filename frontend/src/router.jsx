import { createRouter } from "@tanstack/react-router";
import { Route as rootRouteImport } from "./routes/__root";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as AuthenticatedRouteRouteImport } from "./routes/_authenticated/route";
import { Route as LoginRouteImport } from "./routes/login";
import { Route as SignupRouteImport } from "./routes/signup";
import { Route as StartupsRouteImport } from "./routes/startups";
import { Route as AuthenticatedDashboardRouteImport } from "./routes/_authenticated/dashboard";
import { Route as AuthenticatedExploreRouteImport } from "./routes/_authenticated/explore";
import { Route as AuthenticatedOnboardingRouteImport } from "./routes/_authenticated/onboarding";
import { Route as AuthenticatedWorkspaceRouteImport } from "./routes/_authenticated/workspace";

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRouteImport,
});

const AuthenticatedRouteRoute = AuthenticatedRouteRouteImport.update({
  id: "/_authenticated",
  getParentRoute: () => rootRouteImport,
});

const LoginRoute = LoginRouteImport.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => rootRouteImport,
});

const SignupRoute = SignupRouteImport.update({
  id: "/signup",
  path: "/signup",
  getParentRoute: () => rootRouteImport,
});

const StartupsRoute = StartupsRouteImport.update({
  id: "/startups",
  path: "/startups",
  getParentRoute: () => rootRouteImport,
});

const AuthenticatedDashboardRoute = AuthenticatedDashboardRouteImport.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => AuthenticatedRouteRoute,
});

const AuthenticatedExploreRoute = AuthenticatedExploreRouteImport.update({
  id: "/explore",
  path: "/explore",
  getParentRoute: () => AuthenticatedRouteRoute,
});

const AuthenticatedOnboardingRoute = AuthenticatedOnboardingRouteImport.update({
  id: "/onboarding",
  path: "/onboarding",
  getParentRoute: () => AuthenticatedRouteRoute,
});

const AuthenticatedWorkspaceRoute = AuthenticatedWorkspaceRouteImport.update({
  id: "/workspace/$section",
  path: "/workspace/$section",
  getParentRoute: () => AuthenticatedRouteRoute,
});

const AuthenticatedRouteRouteWithChildren = AuthenticatedRouteRoute._addFileChildren({
  AuthenticatedDashboardRoute,
  AuthenticatedExploreRoute,
  AuthenticatedOnboardingRoute,
  AuthenticatedWorkspaceRoute,
});

const routeTree = rootRouteImport._addFileChildren({
  IndexRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  LoginRoute,
  SignupRoute,
  StartupsRoute,
});

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
  return router;
};
