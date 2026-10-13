export class EntityIdSequence {
  #next = 0;
  next(): number { return this.#next++; }
}
