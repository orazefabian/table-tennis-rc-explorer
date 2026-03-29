import * as cheerio from 'cheerio';

function parsePlayerRows(html) {
  const $ = cheerio.load(html);
  const players = [];
  $('table.Bordered tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 4) {
      const rating = $(cells[0]).text().replace(/\u200B/g, '').trim();
      const nameLink = $(cells[1]).find('a');
      const playerName = nameLink.text().trim();
      const href = nameLink.attr('href') || '';
      const idMatch = href.match(/PlayerID=(\d+)/);
      const id = idMatch ? idMatch[1] : '';
      const lastPlayed = $(cells[3]).text().replace(/\u200B/g, '').trim();
      if (playerName && id) players.push({ id, name: playerName, rating, lastPlayed });
    }
  });
  return players;
}

export { parsePlayerRows };
