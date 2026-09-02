import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import User from "../models/User.js";

const API_URL = process.env.TEST_API_URL || "http://localhost:5050/api/v1";
const testEmail = `integration-${Date.now()}@nexventure.test`;
const testPassword = "NexVenture#2026";

test("real Mongo authentication works and shared mock credentials do not", async () => {
  try {
    const mockLogin = await post("/auth/login", {
      email: "founder@nexventure.com",
      password: "password123",
    });
    assert.equal(mockLogin.response.status, 401);

    const signup = await post("/auth/signup", {
      name: "Integration Test",
      email: testEmail,
      password: testPassword,
      role: "founder",
    });
    assert.equal(signup.response.status, 201);
    assert.equal(signup.body.user.email, testEmail);
    assert.ok(signup.body.token);

    const currentUserResponse = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${signup.body.token}` },
    });
    const currentUser = await currentUserResponse.json();
    assert.equal(currentUserResponse.status, 200);
    assert.equal(currentUser.user.email, testEmail);
    assert.deepEqual(currentUser.user.roles, ["founder"]);
    assert.equal(currentUser.user.onboardingComplete, true);

    const login = await post("/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.body.user.email, testEmail);

    const google = await post("/auth/google", {});
    assert.equal(google.response.status, env.GOOGLE_CLIENT_ID ? 400 : 503);

    const onboarding = await patch(
      "/auth/onboarding",
      { roles: ["student", "founder"], headline: "Student founder", location: "Bengaluru" },
      signup.body.token,
    );
    assert.equal(onboarding.response.status, 200);
    assert.equal(onboarding.body.user.role, "student");
    assert.deepEqual(onboarding.body.user.roles, ["student", "founder"]);
    assert.equal(onboarding.body.user.headline, "Student founder");

    const workspaceUpdate = await patch(
      "/workspace",
      {
        field: "startupProfile",
        value: { name: "Integration Labs", tagline: "Verified workspace persistence" },
      },
      signup.body.token,
    );
    assert.equal(workspaceUpdate.response.status, 200);
    assert.equal(workspaceUpdate.body.workspace.startupProfile.name, "Integration Labs");

    const messageUpdate = await patch(
      "/workspace",
      { field: "message", value: { threadId: "maya", body: "Hello from integration test" } },
      signup.body.token,
    );
    assert.equal(messageUpdate.response.status, 200);
    assert.equal(messageUpdate.body.workspace.messages.at(-1).body, "Hello from integration test");

    const workspaceResponse = await fetch(`${API_URL}/workspace`, {
      headers: { Authorization: `Bearer ${signup.body.token}` },
    });
    const persistedWorkspace = await workspaceResponse.json();
    assert.equal(workspaceResponse.status, 200);
    assert.equal(persistedWorkspace.workspace.startupProfile.name, "Integration Labs");

    const reset = await post("/auth/reset-password", { email: testEmail });
    assert.equal(reset.response.status, 501);

    const startupsResponse = await fetch(`${API_URL}/startups`);
    const startups = await startupsResponse.json();
    assert.equal(startupsResponse.status, 200);
    assert.equal(startups.success, true);
    assert.ok(startups.count > 0);
    assert.equal(startups.count, startups.startups.length);
  } finally {
    await connectDB();
    await User.deleteOne({ email: testEmail });
    await mongoose.disconnect();
  }
});

async function post(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function patch(path, body, token) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}
