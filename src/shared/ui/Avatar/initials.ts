/**
 * Up to two upper-case letters for a display name: first letters of the first two words,
 * or the first two letters of a single word. Code-point safe, so Cyrillic and emoji-free
 * Uzbek Latin ("Oʻ") work: "Олим Абдуллаев" → "ОА", "oybek" → "OY", "" → "".
 */
export function initialsFor(name: string | undefined): string {
  if (!name) {
    return '';
  }
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const [first, second] = words;
  if (!first) {
    return '';
  }
  const letters = second
    ? [firstLetter(first), firstLetter(second)]
    : Array.from(first).slice(0, 2);
  return letters.join('').toLocaleUpperCase();
}

function firstLetter(word: string): string {
  return Array.from(word)[0] ?? '';
}
