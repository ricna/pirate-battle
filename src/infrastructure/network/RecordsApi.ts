import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import type { MatchRecord, Page, RankedMatch } from '../../application/records/MatchRecord';
export const queryClient = new QueryClient({ defaultOptions: { queries: {
  retry: 1, staleTime: 0, refetchOnWindowFocus: false, refetchOnMount: 'always',
}, mutations: { retry: false } } });
const client = axios.create({ baseURL: '/api', timeout: 1800 });
export const api = {
  async ranking(config: string, page: number, signal: AbortSignal) {
    return (await client.get<Page<RankedMatch>>('/ranking', { params: { config, page }, signal })).data;
  },
  async history(playerId: string, page: number, signal: AbortSignal) {
    return (await client.get<Page<MatchRecord>>('/history', { params: { playerId, page }, signal })).data;
  },
  async save(match: MatchRecord) { return (await client.post<MatchRecord>('/history', match)).data; },
};
export function describeError(error: unknown) {
  if (axios.isAxiosError(error)) return error.code === 'ECONNABORTED' ? 'Request timed out. You can retry safely.'
    : error.response ? `Service error (${error.response.status}). Please try again.` : 'Connection failed. Please try again.';
  return 'The request failed. Please try again.';
}
