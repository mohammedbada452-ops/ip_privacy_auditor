/**
 * @packages/shared
 * Shared primitive types and utility interfaces across frontend and backend.
 */

export type Environment = 'development' | 'production' | 'test';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface Timestamp {
  iso: string;
  epochMs: number;
}

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}
