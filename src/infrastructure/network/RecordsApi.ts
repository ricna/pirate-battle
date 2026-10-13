import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { MatchRecord, Page, RankedMatch } from '../../application/records/MatchRecord';

export class RecordsApi {
  readonly #client: AxiosInstance;
  constructor(client: AxiosInstance) {
    this.#client = client;
  }
  async ranking(config: string, page: number, signal: AbortSignal): Promise<Page<RankedMatch>> {
    return (await this.#client.get<Page<RankedMatch>>('/ranking', { params: { config, page }, signal })).data;
  }
  async history(playerId: string, page: number, signal: AbortSignal): Promise<Page<MatchRecord>> {
    return (await this.#client.get<Page<MatchRecord>>('/history', { params: { playerId, page }, signal }))
      .data;
  }
  async save(match: MatchRecord): Promise<MatchRecord> {
    return (await this.#client.post<MatchRecord>('/history', match)).data;
  }
  static describeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') return 'Request timed out. You can retry safely.';
      return error.response
        ? `Service error (${error.response.status}). Please try again.`
        : 'Connection failed. Please try again.';
    }
    return 'The request failed. Please try again.';
  }
}
