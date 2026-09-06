import mongoose from "mongoose";
import { after, before } from "node:test";
import { connectDB } from "../../config/db.js";
import { env } from "../../config/env.js";
import { closeServer, ensureServer } from "../../server.js";

let apiUrl = process.env.TEST_API_URL || "";

export function setupApiTest() {
  before(async () => {
    if (apiUrl) {
      await connectDB();
      return;
    }

    const server = await ensureServer({ port: 0, host: "127.0.0.1" });
    const address = server.address();
    apiUrl = `http://127.0.0.1:${address.port}${env.API_PREFIX}`;
  });

  after(async () => {
    await closeServer();
    await mongoose.disconnect();
    apiUrl = process.env.TEST_API_URL || "";
  });
}

export function getApiUrl() {
  if (!apiUrl) {
    throw new Error("API test server is not ready. Did you call setupApiTest()?");
  }
  return apiUrl;
}

export const api = {
  get(path, token) {
    return request("GET", path, { token });
  },
  patch(path, body, token) {
    return request("PATCH", path, { body, token });
  },
  post(path, body, token) {
    return request("POST", path, { body, token });
  },
  postForm(path, body, token) {
    return request("POST", path, { body, token });
  },
};

async function request(method, path, { body, token } = {}) {
  if (!apiUrl) {
    throw new Error("API test server is not ready. Did you call setupApiTest()?");
  }

  const headers = {};
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null,
  };
}
