import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../config/env.js";
import User from "../models/User.js";
import { api, setupApiTest } from "./helpers/api.js";

const testEmail = `integration-${Date.now()}@nexventure.test`;
const testPassword = "NexVenture#2026";

setupApiTest();

test("real Mongo authentication works and shared mock credentials do not", async () => {
  try {
    const mockLogin = await api.post("/auth/login", {
      email: "founder@nexventure.com",
      password: "password123",
    });
    assert.equal(mockLogin.response.status, 401);

    const signup = await api.post("/auth/signup", {
      name: "Integration Test",
      email: testEmail,
      password: testPassword,
      role: "founder",
    });
    if (signup.response.status !== 201) {
      console.error("Auth test signup failed:", signup.body);
    }
    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.user.email, testEmail);
    assert.ok(signup.body.token);

    const currentUser = await api.get("/auth/me", signup.body.token);
    assert.equal(currentUser.response.status, 200);
    assert.equal(currentUser.body.user.email, testEmail);
    assert.deepEqual(currentUser.body.user.roles, ["founder"]);
    assert.equal(currentUser.body.user.onboardingComplete, true);

    const login = await api.post("/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.body.user.email, testEmail);

    const google = await api.post("/auth/google", {});
    assert.equal(google.response.status, env.GOOGLE_CLIENT_ID ? 400 : 503);

    const onboarding = await api.patch(
      "/auth/onboarding",
      { roles: ["student", "founder"], headline: "Student founder", location: "Bengaluru" },
      signup.body.token,
    );
    if (onboarding.response.status !== 200) {
      console.error("Auth test onboarding failed:", onboarding.body);
    }
    assert.equal(onboarding.response.status, 200);
    assert.equal(onboarding.body.user.role, "student");
    assert.deepEqual(onboarding.body.user.roles, ["student", "founder"]);
    assert.equal(onboarding.body.user.headline, "Student founder");

    const workspaceUpdate = await api.patch(
      "/workspace",
      {
        field: "startupProfile",
        value: { name: "Integration Labs", tagline: "Verified workspace persistence" },
      },
      signup.body.token,
    );
    if (workspaceUpdate.response.status !== 200) {
      console.error("Auth test workspaceUpdate failed:", workspaceUpdate.body);
    }
    assert.equal(workspaceUpdate.response.status, 200);
    assert.equal(workspaceUpdate.body.workspace.startupProfile.name, "Integration Labs");

    const messageUpdate = await api.patch(
      "/workspace",
      { field: "message", value: { threadId: "maya", body: "Hello from integration test" } },
      signup.body.token,
    );
    if (messageUpdate.response.status !== 200) {
      console.error("Auth test messageUpdate failed:", messageUpdate.body);
    }
    assert.equal(messageUpdate.response.status, 200);
    assert.equal(messageUpdate.body.workspace.messages.at(-1).body, "Hello from integration test");

    const persistedWorkspace = await api.get("/workspace", signup.body.token);
    assert.equal(persistedWorkspace.response.status, 200);
    assert.equal(persistedWorkspace.body.workspace.startupProfile.name, "Integration Labs");

    const reset = await api.post("/auth/reset-password", { email: testEmail });
    assert.equal(reset.response.status, 501);

    const adminReports = await api.get("/admin/reports", signup.body.token);
    assert.equal(adminReports.response.status, 403);

    const startups = await api.get("/startups");
    if (startups.response.status !== 200 || !startups.body.success) {
      console.error("Auth test startupsResponse failed:", startups.body);
    }
    assert.equal(startups.response.status, 200);
    assert.equal(startups.body.success, true);
    assert.ok(startups.body.count > 0);
    assert.equal(startups.body.count, startups.body.startups.length);
  } catch (err) {
    console.error("Auth test catch:", err);
    throw err;
  } finally {
    await User.deleteOne({ email: testEmail });
  }
});
