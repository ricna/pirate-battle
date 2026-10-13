export function freezeConfiguration<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeConfiguration(child);
    Object.freeze(value);
  }
  return value;
}
export function freezeStaticConfiguration(configurationClass: object): void {
  for (const value of Object.values(configurationClass)) freezeConfiguration(value);
  Object.freeze(configurationClass);
}
