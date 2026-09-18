import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { httpError } from "../utils/httpError.js";

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_ATTACHMENTS_PER_MESSAGE * MAX_ATTACHMENT_BYTES + 128 * 1024;

const DEFAULT_UPLOAD_ROOT = process.env.VERCEL
  ? path.join("/tmp", "nexventure-uploads")
  : fileURLToPath(new URL("../uploads/", import.meta.url));
const UPLOAD_ROOT = process.env.UPLOAD_DIR || DEFAULT_UPLOAD_ROOT;
const MESSAGE_UPLOAD_ROOT = path.join(UPLOAD_ROOT, "messages");

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]);

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
]);

const MIME_TYPE_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".rtf": "application/rtf",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odp": "application/vnd.oasis.opendocument.presentation",
};

export async function saveConversationAttachment({ conversationId, attachmentId, file }) {
  const normalizedFile = validateAttachmentFile(file);
  const conversationKey = sanitizePathSegment(conversationId);
  const attachmentKey = sanitizePathSegment(attachmentId);
  const originalName = sanitizeFileName(normalizedFile.originalName);
  const extension = getAllowedExtension(originalName, normalizedFile.mimeType);
  const storedName = `${attachmentKey}-${crypto.randomBytes(6).toString("hex")}${extension}`;
  const absolutePath = path.join(MESSAGE_UPLOAD_ROOT, conversationKey, storedName);
  const relativeKey = path.relative(UPLOAD_ROOT, absolutePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, normalizedFile.buffer);

  return {
    _id: attachmentId,
    url: `/conversations/${conversationKey}/attachments/${attachmentKey}`,
    name: originalName,
    type: normalizedFile.mimeType,
    size: normalizedFile.size,
    storageKey: relativeKey,
  };
}

export async function removeStoredAttachments(attachments = []) {
  await Promise.all(
    attachments
      .map((attachment) => attachment.storageKey)
      .filter(Boolean)
      .map((storageKey) => fs.unlink(resolveStoragePath(storageKey)).catch(() => {})),
  );
}

export function getStoredAttachmentFile(attachment) {
  return {
    absolutePath: resolveStoragePath(attachment.storageKey),
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
  };
}

export function validateAttachmentFile(file) {
  const originalName = sanitizeFileName(file?.originalName || file?.name || "attachment");
  const size = Number(file?.size ?? file?.buffer?.length ?? 0);
  const extension = path.extname(originalName).toLowerCase();
  const mimeType = normalizeMimeType(file?.mimeType || file?.type, extension);

  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    throw httpError(400, "Attachment data is missing.");
  }
  if (size <= 0) {
    throw httpError(400, "Attachment file is empty.");
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    throw httpError(413, "Attachment exceeds the 10 MB file size limit.");
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType) || !ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
    throw httpError(415, "Attachment type is not supported.");
  }

  return {
    buffer: file.buffer,
    originalName,
    mimeType,
    size,
  };
}

function resolveStoragePath(storageKey) {
  const absolutePath = path.resolve(UPLOAD_ROOT, storageKey || "");
  const relativePath = path.relative(UPLOAD_ROOT, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw httpError(404, "Attachment not found.");
  }
  return absolutePath;
}

function normalizeMimeType(value, extension) {
  const type = String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (ALLOWED_ATTACHMENT_TYPES.has(type)) return type;
  if (type === "application/octet-stream" || !type) {
    return MIME_TYPE_BY_EXTENSION[extension] || type;
  }
  return type;
}

function getAllowedExtension(name, mimeType) {
  const extension = path.extname(name).toLowerCase();
  if (ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) return extension;
  const inferred = Object.entries(MIME_TYPE_BY_EXTENSION).find(([, type]) => type === mimeType);
  return inferred?.[0] || "";
}

function sanitizeFileName(name) {
  return (
    path
      .basename(String(name || "attachment"))
      .replace(/[^\w.\- ()]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "attachment"
  );
}

function sanitizePathSegment(value) {
  const segment = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!segment) throw httpError(400, "Invalid attachment path.");
  return segment;
}
