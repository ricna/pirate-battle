import type { LocalStorageStore } from '../../infrastructure/storage/LocalStorageStore';
import { isMatch, isMatchList } from './MatchRecord';
import type { MatchRecord } from './MatchRecord';

export class MatchRepository {
  readonly #storage: LocalStorageStore;
  constructor(storage: LocalStorageStore) {
    this.#storage = storage;
  }
  pending(): MatchRecord[] {
    return this.#storage.read('pending', isMatchList, []);
  }
  last(): MatchRecord | null {
    return this.#storage.read<MatchRecord | null>(
      'last',
      (value): value is MatchRecord | null => value === null || isMatch(value),
      null,
    );
  }
  saveLast(record: MatchRecord): void {
    this.#storage.write('last', record);
  }
  savePending(records: readonly MatchRecord[]): void {
    this.#storage.write('pending', records);
  }
}
