export const countReadingMinutes = (plain: string) => {
  const words = plain.trim().split(/[\n\t ]+/).length;
  return Math.max(1, Math.round(words / 200));
};
