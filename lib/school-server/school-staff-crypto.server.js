import crypto from "node:crypto";
import {
  generateStudentPin,
  hashStudentSecret,
  normalizeStudentPin,
} from "../guardian-server/guardian-crypto.server.js";

export const STAFF_CODE_RE = /^[a-z]{3,4}-[to]\d{4}$/;

export function hashStaffSecret(value) {
  return hashStudentSecret(value);
}

export function normalizeStaffCode(raw) {
  return String(raw || "").toLowerCase().trim();
}

export function normalizeStaffPin(raw) {
  return normalizeStudentPin(raw);
}

export function generateStaffPin() {
  return generateStudentPin();
}

export function generateStaffSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateInternalStaffAuthEmail() {
  const id = crypto.randomUUID();
  return `staff-${id}@staff.noreply.liosh`;
}

export function generateInternalStaffAuthPassword() {
  return crypto.randomBytes(32).toString("base64url");
}
