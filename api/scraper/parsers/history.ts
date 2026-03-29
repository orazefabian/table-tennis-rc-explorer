import * as cheerio from 'cheerio';
import type { RatingHistoryEntry } from '../types.js';

function parsePlayerHistory(html: string): RatingHistoryEntry[] {
  const $ = cheerio.load(html);
  const history: RatingHistoryEntry[] = [];

  $('table.Bordered').first().find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 5) {
      const date = $(cells[0]).text().trim();
      const eventLink = $(cells[1]).find('a');
      const eventName = eventLink.text().trim();
      const eventHref = eventLink.attr('href') || '';
      const eventIdMatch = eventHref.match(/EventID=(\d+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : '';
      const initialRating = $(cells[2]).text().replace(/\u200B/g, '').trim();
      const change = $(cells[3]).text().replace(/\u200B/g, '').trim();
      const finalRating = $(cells[4]).text().replace(/\u200B/g, '').trim();

      history.push({ date, eventName, eventId, initialRating, change, finalRating });
    }
  });

  return history;
}

export { parsePlayerHistory };
