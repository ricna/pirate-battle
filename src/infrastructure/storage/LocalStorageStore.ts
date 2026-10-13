/** Browser adapter with lazy storage access and visible persistence failures. */
export class LocalStorageStore {
  #warning: string | null = null;
  readonly #namespace: string;
  constructor(namespace: string) {
    if (!namespace) throw new Error('Storage requires an explicit namespace.');
    this.#namespace = namespace;
  }
  get warning(): string | null {
    return this.#warning;
  }
  read<T>(key: string, validate: (value: unknown) => value is T, initial: T): T {
    const value = this.readValue(key);
    if (value === null) return initial;
    if (validate(value)) return value;
    this.reportInvalidData();
    return initial;
  }
  readValue(key: string): unknown {
    try {
      const raw = localStorage.getItem(`${this.#namespace}.${key}`);
      return raw === null ? null : (JSON.parse(raw) as unknown);
    } catch {
      this.#warning = 'Local storage is unavailable or invalid. Progress could not be restored.';
      return null;
    }
  }
  write(key: string, value: unknown): void {
    try {
      localStorage.setItem(`${this.#namespace}.${key}`, JSON.stringify(value));
    } catch {
      this.#warning = 'Local storage could not save your progress.';
    }
  }
  reportInvalidData(): void {
    this.#warning = 'Some stored data was invalid and could not be restored.';
  }
}
