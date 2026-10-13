import type { LocalStorageStore } from '../../infrastructure/storage/LocalStorageStore';

export class PlayerIdentityRepository {
  readonly #storage: LocalStorageStore;
  constructor(storage: LocalStorageStore) {
    this.#storage = storage;
  }
  load(): string {
    const id = this.#storage.read(
      'player',
      (value): value is string => typeof value === 'string' && value.length > 0,
      '',
    );
    if (id) return id;
    const created = crypto.randomUUID();
    this.#storage.write('player', created);
    return created;
  }
}
