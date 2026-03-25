export class Timestamp {
  constructor(public seconds = 0, public nanoseconds = 0) {}

  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000));
  }

  static now() {
    const nowMs = Date.now();
    const seconds = Math.floor(nowMs / 1000);
    const nanoseconds = (nowMs % 1000) * 1_000_000;
    return new Timestamp(seconds, nanoseconds);
  }
}

const createDocRef = () => ({
  get: async () => ({ exists: false, data: () => ({}) }),
  set: async () => {},
  update: async () => {},
  create: async () => {},
  collection: () => ({
    doc: () => createDocRef(),
  }),
});

export const adminDb = {
  collection: () => ({
    doc: () => createDocRef(),
  }),
  runTransaction: async (fn: (tx: unknown) => Promise<void> | void) =>
    fn({
      get: async () => ({ exists: false, data: () => ({}) }),
      set: async () => {},
      update: async () => {},
    }),
};

export const FieldValue = {
  increment: (value: number) => value,
  serverTimestamp: () => new Date(),
};

export default {};
