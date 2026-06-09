/**
 * Extract a numeric rating from strings like "1523.45 ±12.3".
 * Returns 0 if input is falsy or no number is found.
 */
export function parseRating(s) {
  if (!s) return 0;
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Parse a score string like "3-1" or "3–1" into set counts.
 * Returns { setsWon, setsLost } or null if the string is unparseable.
 */
export function parseScore(scoreStr) {
  if (!scoreStr) return null;
  const normalized = scoreStr.replace(/[–—]/g, '-');
  const parts = normalized.split('-').filter(p => p.trim());
  if (parts.length !== 2) return null;
  const setsWon = parseInt(parts[0], 10);
  const setsLost = parseInt(parts[1], 10);
  if (isNaN(setsWon) || isNaN(setsLost)) return null;
  return { setsWon, setsLost };
}

/**
 * Classify a rating-change string (e.g. "+5", "−3", "0") into a CSS class name.
 * Handles the Unicode minus sign "−" as well as the ASCII hyphen "-".
 * Returns 'positive', 'negative', or '' (neutral/unknown).
 */
export function classifyChange(changeStr) {
  if (!changeStr) return '';
  if (changeStr.startsWith('+')) return 'positive';
  if (changeStr.startsWith('-') || changeStr.startsWith('−')) return 'negative';
  return '';
}
