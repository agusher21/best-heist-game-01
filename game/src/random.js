// Seeded pseudo-random number generator (Mulberry32).

export class SeededRNG {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  /** Returns a uint32 in [0, 2^32-1]. */
  nextUInt32() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0);
  }

  /** Returns a float in [0, 1). */
  nextFloat() {
    return this.nextUInt32() / 0x100000000;
  }

  /** Returns a float in [min, max). */
  nextRange(min, max) {
    return min + this.nextFloat() * (max - min);
  }

  /** Returns an integer in [min, max] inclusive. */
  nextInt(min, max) {
    return Math.floor(this.nextRange(min, max + 1));
  }

  /** Returns a random element from an array. */
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /** Returns a shuffled copy of an array (Fisher-Yates). */
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

/** Creates a seeded RNG from a numeric seed. */
export function createRNG(seed) {
  return new SeededRNG(seed);
}