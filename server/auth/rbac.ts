import type { AdminRole } from '../db/types';

export type AdminPermission =
  | 'stats:read'
  | 'scans:read'
  | 'logs:read'
  | 'metrics:read'
  | 'audit:read';

const ROLE_PERMISSIONS: Record<AdminRole, Set<AdminPermission>> = {
  SUPERADMIN: new Set(['stats:read','scans:read','logs:read','metrics:read','audit:read']),
  ADMIN: new Set(['stats:read','scans:read','logs:read','metrics:read','audit:read']),
  ANALYST: new Set(['stats:read','scans:read','metrics:read']),
  VIEWER: new Set(['stats:read','scans:read']),
};

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
