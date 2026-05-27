import crypto from "node:crypto";
import {
  WORKSHEET_BUCKET,
  WORKSHEET_MAX_BYTES,
  WORKSHEET_SIGNED_URL_STUDENT_SEC,
  WORKSHEET_SIGNED_URL_TEACHER_SEC,
  worksheetDbError,
} from "./worksheet-shared.server.js";

/**
 * @param {Buffer} buffer
 */
export function validatePdfBuffer(buffer) {
  if (!buffer || buffer.length < 4) {
    return { ok: false, code: "invalid_pdf" };
  }
  if (buffer.length > WORKSHEET_MAX_BYTES) {
    return { ok: false, code: "file_too_large" };
  }
  const header = buffer.subarray(0, 4).toString("ascii");
  if (header !== "%PDF") {
    return { ok: false, code: "invalid_pdf" };
  }
  return { ok: true };
}

/**
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {string} fileRole
 */
export function buildWorksheetStoragePath(teacherId, worksheetId, fileRole) {
  const id = crypto.randomUUID();
  const prefix = fileRole === "answer_key" ? "answer-key-" : "";
  return `${teacherId}/${worksheetId}/${prefix}${id}.pdf`;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ storagePath: string, buffer: Buffer, contentType?: string }} opts
 */
export async function uploadWorksheetPdf(serviceRole, opts) {
  const validation = validatePdfBuffer(opts.buffer);
  if (!validation.ok) {
    return { ok: false, status: 400, code: validation.code };
  }

  const { error } = await serviceRole.storage.from(WORKSHEET_BUCKET).upload(opts.storagePath, opts.buffer, {
    contentType: opts.contentType || "application/pdf",
    upsert: false,
  });

  if (error) {
    return worksheetDbError(error);
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} storagePath
 * @param {'teacher'|'student'} audience
 */
export async function createWorksheetSignedUrl(serviceRole, storagePath, audience) {
  const expiresIn =
    audience === "teacher" ? WORKSHEET_SIGNED_URL_TEACHER_SEC : WORKSHEET_SIGNED_URL_STUDENT_SEC;

  const { data, error } = await serviceRole.storage
    .from(WORKSHEET_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    return worksheetDbError(error);
  }

  return { ok: true, signedUrl: data.signedUrl, expiresIn };
}

/**
 * Parse upload body: JSON { pdfBase64, originalFilename, fileRole } or raw buffer from multipart field.
 * @param {import('http').IncomingMessage} req
 * @param {Record<string, unknown>} [jsonBody]
 */
export async function parseWorksheetUploadPayload(req, jsonBody) {
  if (jsonBody && typeof jsonBody === "object") {
    const b64 = jsonBody.pdfBase64 ?? jsonBody.pdf_base64;
    if (b64 != null) {
      const originalFilename = String(jsonBody.originalFilename || jsonBody.original_filename || "worksheet.pdf").trim();
      const fileRole = String(jsonBody.fileRole || jsonBody.file_role || "worksheet").trim().toLowerCase();
      let buffer;
      try {
        const raw = String(b64).includes(",") ? String(b64).split(",").pop() : String(b64);
        buffer = Buffer.from(raw, "base64");
      } catch {
        return { ok: false, status: 400, code: "validation_failed" };
      }
      return { ok: true, buffer, originalFilename, fileRole };
    }
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    return { ok: false, status: 400, code: "validation_failed", message: "Expected pdfBase64 JSON or multipart upload" };
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : null;
  if (!boundary) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const parts = parseMultipartBuffer(body, boundary);
  const filePart = parts.find((p) => p.name === "file" || p.name === "pdf");
  if (!filePart?.data?.length) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const rolePart = parts.find((p) => p.name === "fileRole" || p.name === "file_role");
  const fileRole = rolePart?.data ? String(rolePart.data.toString("utf8")).trim().toLowerCase() : "worksheet";
  const filename =
    filePart.filename ||
    parts.find((p) => p.name === "originalFilename")?.data?.toString("utf8") ||
    "worksheet.pdf";

  return {
    ok: true,
    buffer: filePart.data,
    originalFilename: String(filename).trim() || "worksheet.pdf",
    fileRole,
  };
}

/**
 * @param {Buffer} body
 * @param {string} boundary
 */
function parseMultipartBuffer(body, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  /** @type {{ name: string, filename?: string, data: Buffer }[]} */
  const parts = [];
  let start = body.indexOf(delim);
  while (start !== -1) {
    const next = body.indexOf(delim, start + delim.length);
    const segment = body.subarray(start + delim.length, next === -1 ? body.length : next);
    const headerEnd = segment.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headerText = segment.subarray(0, headerEnd).toString("utf8");
      const data = segment.subarray(headerEnd + 4, segment.length - 2);
      const nameMatch = headerText.match(/name="([^"]+)"/);
      const filenameMatch = headerText.match(/filename="([^"]+)"/);
      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: filenameMatch ? filenameMatch[1] : undefined,
          data,
        });
      }
    }
    if (next === -1) break;
    start = next;
  }
  return parts;
}
