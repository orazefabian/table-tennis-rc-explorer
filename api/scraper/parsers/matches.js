import * as cheerio from 'cheerio';

function parseMatches(html) {
  const $ = cheerio.load(html);
  const matches = [];
  const h2h = [];
  const tables = $('table.Bordered');

  tables.eq(0).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 7) {
      const date = $(cells[0]).text().trim();
      const eventHref = $(cells[0]).find('a').attr('href') || '';
      const eventIdMatch = eventHref.match(/EventID=(\d+)/);
      const eventId = eventIdMatch ? eventIdMatch[1] : '';
      const opponentLink = $(cells[1]).find('a');
      const opponent = opponentLink.text().trim();
      const oppHref = opponentLink.attr('href') || '';
      const oppIdMatch = oppHref.match(/PlayerID=(\d+)/);
      const opponentId = oppIdMatch ? oppIdMatch[1] : '';
      const opponentRating = $(cells[2]).text().replace(/\u200B/g, '').trim();
      const result = $(cells[3]).text().trim();
      const rating = $(cells[4]).text().replace(/\u200B/g, '').trim();
      const pointChange = $(cells[5]).text().replace(/\u200B/g, '').trim();
      const score = $(cells[6]).text().trim();

      matches.push({ date, eventId, opponent, opponentId, opponentRating, result, rating, pointChange, score });
    }
  });

  tables.eq(1).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 4) {
      const nameLink = $(cells[0]).find('a');
      const name = nameLink.text().trim() || $(cells[0]).text().trim();
      const href = nameLink.attr('href') || '';
      const idMatch = href.match(/PlayerID=(\d+)/);
      const oppId = idMatch ? idMatch[1] : '';
      const wins = parseInt($(cells[1]).text().trim(), 10) || 0;
      const losses = parseInt($(cells[2]).text().trim(), 10) || 0;
      const winPct = $(cells[3]).text().trim();

      h2h.push({ name, id: oppId, wins, losses, winPct });
    }
  });

  return { matches, headToHead: h2h };
}

export { parseMatches };
