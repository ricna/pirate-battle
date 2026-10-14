import { freezeStaticConfiguration } from '../../game/core/Immutable';

/** Authoritative HTTP client and mock-server settings shared by Axios, TanStack Query and MSW. */
export class NetworkConfig {
  private constructor() {}
  static readonly BaseUrl = '/api';
  /** Axios aborts slower requests; the slow scenario stays below it and the timeout scenarios exceed it. */
  static readonly RequestTimeoutMs = 1800;
  /** One automatic query retry; record submission retries are explicit user actions or page reloads. */
  static readonly QueryRetries = 1;
  static readonly PageSize = 5;
  /** Delay before the mock server replays an already committed record for a same-ID retry. */
  static readonly ExistingRecordDelayMs = 100;
  /** Marks every mocked response; an `/api/` response without it came from the static host instead. */
  static readonly MockHeader = 'x-pirate-mock';
  /** Marks the single retry made after re-activating the mock worker. */
  static readonly RecoveryHeader = 'x-pirate-mock-recovery';
  /** Longest wait for a restarted worker to acknowledge this page before the retry. */
  static readonly ReactivationTimeoutMs = 1000;
}

freezeStaticConfiguration(NetworkConfig);
