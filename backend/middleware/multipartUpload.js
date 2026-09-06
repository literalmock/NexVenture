import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_BYTES,
  MAX_MULTIPART_BYTES,
} from "../services/fileStorageService.js";
import { httpError } from "../utils/httpError.js";

const HEADER_SEPARATOR = Buffer.from("\r\n\r\n");
const CRLF = Buffer.from("\r\n");

export async function parseMessageMultipart(req, res, next) {
  void res;

  try {
    if (!isMultipart(req)) {
      return next();
    }

    const boundary = getBoundary(req.headers["content-type"]);
    if (!boundary) {
      throw httpError(400, "Multipart boundary is missing.");
    }

    const rawBody = await readRequestBody(req);
    const parsed = parseMultipartBody(rawBody, boundary);
    req.body = parsed.fields;
    req.files = parsed.files;
    return next();
  } catch (error) {
    return next(error);
  }
}

function isMultipart(req) {
  return String(req.headers["content-type"] || "")
    .toLowerCase()
    .includes("multipart/form-data");
}

function getBoundary(contentType) {
  const match = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return (match?.[1] || match?.[2] || "").trim();
}

async function readRequestBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_MULTIPART_BYTES) {
      throw httpError(413, "Message attachments exceed the upload size limit.");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function parseMultipartBody(rawBody, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(rawBody, delimiter);
  const fields = {};
  const files = [];

  for (const segment of parts) {
    const part = trimPart(segment);
    if (!part.length || startsWith(part, Buffer.from("--"))) continue;

    const headerEnd = part.indexOf(HEADER_SEPARATOR);
    if (headerEnd === -1) continue;

    const headers = parseHeaders(part.subarray(0, headerEnd).toString("utf8"));
    const body = stripTrailingCrlf(part.subarray(headerEnd + HEADER_SEPARATOR.length));
    const disposition = headers["content-disposition"] || "";
    const fieldName = getDispositionParam(disposition, "name");
    const fileName = getDispositionParam(disposition, "filename");

    if (!fieldName) continue;
    if (fileName !== null) {
      if (!fileName) continue;
      if (files.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        throw httpError(400, `Messages can include up to ${MAX_ATTACHMENTS_PER_MESSAGE} files.`);
      }
      if (body.length > MAX_ATTACHMENT_BYTES) {
        throw httpError(413, "Attachment exceeds the 10 MB file size limit.");
      }
      files.push({
        fieldName,
        originalName: fileName,
        mimeType: headers["content-type"] || "application/octet-stream",
        size: body.length,
        buffer: body,
      });
      continue;
    }

    setField(fields, fieldName, body.toString("utf8"));
  }

  return { fields, files };
}

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let cursor = 0;
  let index = buffer.indexOf(delimiter, cursor);

  while (index !== -1) {
    parts.push(buffer.subarray(cursor, index));
    cursor = index + delimiter.length;
    index = buffer.indexOf(delimiter, cursor);
  }
  parts.push(buffer.subarray(cursor));
  return parts;
}

function trimPart(part) {
  let next = part;
  if (startsWith(next, CRLF)) next = next.subarray(CRLF.length);
  return stripTrailingCrlf(next);
}

function stripTrailingCrlf(buffer) {
  return endsWith(buffer, CRLF) ? buffer.subarray(0, buffer.length - CRLF.length) : buffer;
}

function parseHeaders(value) {
  return value.split("\r\n").reduce((headers, line) => {
    const index = line.indexOf(":");
    if (index === -1) return headers;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
    return headers;
  }, {});
}

function getDispositionParam(disposition, key) {
  const match = disposition.match(new RegExp(`${key}="([^"]*)"`, "i"));
  if (!match) return null;
  return match[1].replace(/\\"/g, '"');
}

function setField(fields, key, value) {
  if (fields[key] === undefined) {
    fields[key] = value;
    return;
  }
  fields[key] = Array.isArray(fields[key]) ? [...fields[key], value] : [fields[key], value];
}

function startsWith(buffer, prefix) {
  return buffer.length >= prefix.length && buffer.subarray(0, prefix.length).equals(prefix);
}

function endsWith(buffer, suffix) {
  return (
    buffer.length >= suffix.length && buffer.subarray(buffer.length - suffix.length).equals(suffix)
  );
}
