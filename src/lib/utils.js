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
 * Split a score string like "3-1" or "3–1" into its two numbers.
 *
 * Ratings Central always writes the score winner-first, so the first number
 * belongs to whoever won the match — not necessarily the player being viewed.
 * Use `parseSets` when you need the counts from the player's perspective.
 *
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

/**
 * Set counts from the viewed player's perspective.
 *
 * Ratings Central records scores winner-first, so a loss like "3–1" means the
 * player won 1 set and lost 3. Returns null if the score is unparseable.
 */
export function parseSets(scoreStr, result) {
  const score = parseScore(scoreStr);
  if (!score) return null;
  if (result === 'L') return { setsWon: score.setsLost, setsLost: score.setsWon };
  return score;
}

/**
 * Render a score from the viewed player's perspective ("1–3" for a 3–1 loss).
 * Falls back to the original string when it cannot be parsed.
 */
export function formatScore(scoreStr, result) {
  const sets = parseSets(scoreStr, result);
  if (!sets) return scoreStr ?? '';
  return `${sets.setsWon}\u2013${sets.setsLost}`;
}

/**
 * Parse a date string from Ratings Central into a local-time Date.
 *
 * ISO dates ("2026-05-10") are parsed component-wise: `new Date(isoString)`
 * treats them as UTC midnight, which lands on the previous day for viewers
 * west of UTC and can push a match into the wrong season.
 * Returns null if the string is unparseable.
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const slashed = trimmed.split(/\s*\/\s*/);
  if (slashed.length === 3) {
    const [m, d, y] = slashed.map(Number);
    if ([m, d, y].every(n => !isNaN(n))) {
      return new Date(y + (y < 100 ? 2000 : 0), m - 1, d);
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}
