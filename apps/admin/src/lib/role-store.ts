import { roles as seedRoles } from "./mock";
import { Role } from "./types";

const STORAGE_KEY = "wondera-admin-roles";

export function readRoles(): Role[] {
  if (typeof window === "undefined") return seedRoles;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedRoles;
  try {
    const parsed = JSON.parse(raw) as Role[];
    if (!Array.isArray(parsed) || !parsed.length) return seedRoles;
    return parsed;
  } catch (err) {
    console.warn("Failed to parse roles from storage", err);
    return seedRoles;
  }
}

export function writeRoles(next: Role[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

export function upsertRole(role: Role): Role[] {
  const list = readRoles();
  const exists = list.some((r) => r.id === role.id);
  const next = exists ? list.map((r) => (r.id === role.id ? role : r)) : [...list, role];
  writeRoles(next);
  return next;
}

export function removeRole(id: string): Role[] {
  const next = readRoles().filter((r) => r.id !== id);
  writeRoles(next);
  return next;
}
