import type { LocalStorageStore } from '../../infrastructure/storage/LocalStorageStore';
import { OptionsConfig } from './OptionsConfig';
import type { Options } from './Options';

export class OptionsRepository {
  readonly #storage: LocalStorageStore;
  constructor(storage: LocalStorageStore) {
    this.#storage = storage;
  }
  load(): Options {
    const stored = this.#storage.readValue('options');
    if (stored === null) return { ...OptionsConfig.Default };
    const options = OptionsConfig.restore(stored);
    if (options) return options;
    this.#storage.reportInvalidData();
    return { ...OptionsConfig.Default };
  }
  save(options: Options): void {
    if (!OptionsConfig.isValid(options)) throw new Error('Cannot persist invalid application options.');
    this.#storage.write('options', options);
  }
}
