import * as cheerio from 'cheerio';
import type { PlayerInfo } from '../types.js';

function parsePlayerInfo(html: string, id: string): PlayerInfo {
  const $ = cheerio.load(html);
  const info: PlayerInfo = { id, name: '', rating: '' };

  const h1 = $('h1.CenteredHeading');
  const nameText = h1.clone().children().remove().end().text().trim();
  info.name = nameText;

  const subheader = h1.find('.Subheader').text().replace(/\u200B/g, '').trim();
  info.rating = subheader;

  const rows = $('table.Bordered tbody tr');
  rows.each((_, row) => {
    const label = $(row).find('td').first().text().trim().toLowerCase();
    const value = $(row).find('td').last().text().replace(/\u200B/g, '').trim();
    if (label.includes('country')) info.country = value;
    else if (label.includes('primary club')) info.primaryClub = value;
    else if (label.includes('city')) info.city = value;
    else if (label.includes('province')) info.province = value;
    else if (label.includes('sex')) info.sex = value;
    else if (label.includes('deceased')) info.deceased = value;
  });

  return info;
}

export { parsePlayerInfo };
