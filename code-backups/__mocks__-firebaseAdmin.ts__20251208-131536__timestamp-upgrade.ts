export class Timestamp {
  constructor(public seconds = 0, public nanoseconds = 0) {}

  toDate() {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000));
  }
}

export const adminDb = {
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: false }),
    }),
  }),
};

export default {};
