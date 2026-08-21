/**
 * Extract a Ratings Central player ID from a link href.
 *
 * Links come in two shapes: absolute ones (`Player.php?PlayerID=123`) and
 * in-page anchors used by match/event tables (`EventDetail.php?EventID=9#P123`).
 * The anchor form has no `PlayerID=`, so it must be matched separately.
 */
export function extractPlayerId(href: string): string {
  if (!href) return '';
  const direct = href.match(/PlayerID=(\d+)/);
  if (direct) return direct[1];
  const anchor = href.match(/#P(\d+)/);
  return anchor ? anchor[1] : '';
}
