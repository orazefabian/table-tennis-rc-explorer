import * as cheerio from 'cheerio';

function parseRatingChange(text) {
  const clean = text.replace(/Rating Change/i, '').replace(/\u200B/g, '').replace(/\s+/g, ' ').trim();
  const m = clean.match(/([\d.]+±[\d.]+)\s*([+−-])\s*([\d.]+)\s*=\s*([\d.]+(?:±[\d.]+)?)/);
  if (m) {
    const sign = m[2] === '+' ? '+' : '−';
    return { initial: m[1], change: sign + m[3], final: m[4] };
  }
  return { initial: '', change: '', final: clean };
}

function parseMatches(playerLi) {
  const $ = cheerio.load(playerLi);
  const matches = [];
  let cur = $(playerLi).next('li');
  let group = null;

  while (cur.length && !cur.hasClass('Gap')) {
    const cls = cur.attr('class') || '';
    const isHeader = cls.includes('Header') || cls.includes('Subheader') || cls.includes('NotNeeded');

    if (!isHeader) {
      if (cls.includes('WinPointChangeBorder')) {
        group = { result: 'W', pointChange: cur.text().replace(/\u200B/g, '').trim(), oppRating: '', opponentName: '', opponentId: '', score: '' };
      } else if (cls.includes('LossPointChangeBorder')) {
        group = { result: 'L', pointChange: cur.text().replace(/\u200B/g, '').trim(), oppRating: '', opponentName: '', opponentId: '', score: '' };
      } else if (group && !group.oppRating && !cls.includes('PointChangeBorder') && !cls.includes('ScoreBorder') && !cls.includes('Opponent')) {
        group.oppRating = cur.text().replace(/\u200B/g, '').trim();
      } else if (group && cls.includes('Opponent')) {
        const a = cur.find('a');
        group.opponentName = a.text().trim() || cur.text().trim();
        const href = a.attr('href') || '';
        const idM = href.match(/P(\d+)/);
        group.opponentId = idM ? idM[1] : '';
      } else if (group && (cls.includes('WinScoreBorder') || cls.includes('LossScoreBorder'))) {
        group.score = cur.text().replace(/\u200B/g, '').trim();
        matches.push(group);
        group = null;
      }
    }
    cur = cur.next('li');
  }
  return matches;
}

function parseEventDetail(html, eventId, playerId = null) {
  const $ = cheerio.load(html);

  const name = $('h1.CenteredHeading').clone().find('.Subheader').remove().end().text().trim();
  const subheaderHtml = $('h1.CenteredHeading .Subheader').html() || '';
  const date = subheaderHtml.split(/<br\s*\/?>/i)[0].trim();

  if (playerId) {
    const playerLi = $('ul.Detailed li.Header.PlayerBorder').filter((_, el) => {
      const href = $(el).find('a').attr('href') || '';
      return href.includes(`PlayerID=${playerId}`);
    }).first();

    if (!playerLi.length) {
      return { error: 'Player not found in this event' };
    }

    const playerName = playerLi.find('a').text().trim();
    const ratingLi = $(playerLi).nextAll('li').filter((_, l) => $(l).hasClass('RatingBorder')).first();
    const rc = parseRatingChange(ratingLi.text());
    const matches = parseMatches(playerLi);

    return { id: eventId, name, date, player: { id: playerId, name: playerName, ...rc }, matches };
  }

  const players = [];
  $('ul.Detailed li.Header.PlayerBorder').each((_, el) => {
    const playerLink = $(el).find('a');
    const playerName = playerLink.text().trim();
    const href = playerLink.attr('href') || '';
    const idMatch = href.match(/PlayerID=(\d+)/);
    const pid = idMatch ? idMatch[1] : '';
    const ratingLi = $(el).nextAll('li').filter((__, l) => $(l).hasClass('RatingBorder')).first();
    const rc = parseRatingChange(ratingLi.text());
    if (playerName) players.push({ name: playerName, id: pid, ...rc });
  });

  return { id: eventId, name, date, players };
}

export { parseEventDetail, parseRatingChange };
