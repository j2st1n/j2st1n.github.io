export const slugifyStr = (str: string): string =>
  str
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{Letter}\p{Number}._~]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
