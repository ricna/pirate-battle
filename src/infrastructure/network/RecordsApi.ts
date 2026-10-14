import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { isMatch, isPage, isRankedMatch } from '../../application/records/MatchRecord';
import type { MatchRecord, Page, RankedMatch } from '../../application/records/MatchRecord';

/** Typed records client; responses are validated before they reach queries or the UI. */
export class RecordsApi {
  readonly #client: AxiosInstance;
  constructor(client: AxiosInstance) {
    this.#client = client;
  }
  async ranking(config: string, page: number, signal: AbortSignal): Promise<Page<RankedMatch>> {
    const { data } = await this.#client.get<unknown>('/ranking', { params: { config, page }, signal });
    if (!isPage(data, isRankedMatch)) throw new Error('The ranking response was not a valid page.');
    return data;
  }
  async history(playerId: string, page: number, signal: AbortSignal): Promise<Page<MatchRecord>> {
    const { data } = await this.#client.get<unknown>('/history', { params: { playerId, page }, signal });
    if (!isPage(data, isMatch)) throw new Error('The history response was not a valid page.');
    return data;
  }
  async save(match: MatchRecord): Promise<MatchRecord> {
    const { data } = await this.#client.post<unknown>('/history', match);
    if (!isMatch(data) || data.id !== match.id) throw new Error('The saved battle response was invalid.');
    return data;
  }
  static describeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') return 'Request timed out. You can retry safely.';
      return error.response
        ? `Service error (${error.response.status}). Please try again.`
        : 'Connection failed. Please try again.';
    }
    return error instanceof Error ? error.message : 'The request failed. Please try again.';
  }
}
