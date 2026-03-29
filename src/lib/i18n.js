import { writable, derived } from 'svelte/store';

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null;
export const lang = writable(stored === 'en' ? 'en' : 'de');

// Persist to localStorage whenever it changes
lang.subscribe(l => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('lang', l);
});

const translations = {
  en: {
    // App shell
    appName: 'RC Explorer',
    tagline: 'Ratings Central Player Lookup',
    dataFrom: 'Data from',
    ratingscentral: 'Ratings Central',

    // Search page
    findAPlayer: 'Find a Player',
    searchSubtitle: "Search Ratings Central's database of 128,000+ players",
    enterPlayerName: 'Enter player name',
    search: 'Search',
    searching: 'Searching…',
    noPlayersFound: (q) => `No players found for "${q}"`,
    playersFound: (n) => `${n} player${n !== 1 ? 's' : ''} found`,
    colRating: 'Rating',
    colName: 'Name',
    colId: 'ID',
    colLastPlayed: 'Last Played',

    // Player page
    backToSearch: '← Back to Search',
    loadingPlayer: 'Loading player data…',
    tabOverview: 'Overview',
    tabHistory: 'Rating History',
    tabMatches: 'Matches',
    tabH2H: 'Head-to-Head',
    cardRatingHistory: 'Rating History',
    cardStats: 'Stats',
    statTotalEvents: 'Total Events',
    statTotalMatches: 'Total Matches',
    statWinRate: 'Win Rate',
    statOpponentsFaced: 'Opponents Faced',
    statHighestRating: 'Highest Rating',
    statLowestRating: 'Lowest Rating',
    cardRecentEvents: 'Recent Events',

    // Event page
    back: '← Back',
    loadingEvent: 'Loading event details…',
    statInitial: 'Initial',
    statChange: 'Change',
    statFinal: 'Final',
    statRecord: 'Record',
    matches: 'Matches',
    matchesPlayed: (n) => `${n} played`,
    colResult: 'Result',
    colOpponent: 'Opponent',
    colOppRating: 'Opp. Rating',
    colPtChange: 'Pt Change',
    colScore: 'Score',
    noMatchData: 'No match data available for this player.',

    // History table
    noRatingHistory: 'No rating history available',
    colDate: 'Date',
    colEvent: 'Event',

    // Match table
    record: 'Record:',
    filterByOpponent: 'Filter by opponent…',
    filterAll: 'All',
    filterWins: 'Wins only',
    filterLosses: 'Losses only',
    noMatchesFound: 'No matches found',
    matchCount: (n) => `${n} match${n !== 1 ? 'es' : ''}`,
    colRatingHeader: 'Rating',

    // Head-to-head
    h2hTitle: 'Head-to-Head Records',
    noH2HData: 'No head-to-head data available',
    colMatches: 'Matches',
    colWins: 'W',
    colLosses: 'L',
    colWinPct: 'Win %',

    // Chart
    chartRating: 'Rating',
    chartUpperBand: 'Rating ±1 SD (upper)',
    chartLowerBand: 'Rating ±1 SD (lower)',
    chartTooltipRating: (r, c) => `Rating: ${r} (change: ${c})`,
    noHistoryData: 'No history data available',
  },
  de: {
    // App shell
    appName: 'RC Explorer',
    tagline: 'Ratings Central Spielersuche',
    dataFrom: 'Daten von',
    ratingscentral: 'Ratings Central',

    // Search page
    findAPlayer: 'Spieler suchen',
    searchSubtitle: 'Durchsuche die Ratings-Central-Datenbank mit über 128.000 Spielern',
    enterPlayerName: 'Spielername eingeben',
    search: 'Suchen',
    searching: 'Suche läuft…',
    noPlayersFound: (q) => `Keine Spieler gefunden für „${q}"`,
    playersFound: (n) => `${n} Spieler gefunden`,
    colRating: 'Wertung',
    colName: 'Name',
    colId: 'ID',
    colLastPlayed: 'Zuletzt gespielt',

    // Player page
    backToSearch: '← Zurück zur Suche',
    loadingPlayer: 'Spielerdaten werden geladen…',
    tabOverview: 'Übersicht',
    tabHistory: 'Wertungsverlauf',
    tabMatches: 'Spiele',
    tabH2H: 'Direkte Duelle',
    cardRatingHistory: 'Wertungsverlauf',
    cardStats: 'Statistik',
    statTotalEvents: 'Turniere gesamt',
    statTotalMatches: 'Spiele gesamt',
    statWinRate: 'Siegquote',
    statOpponentsFaced: 'Gegner',
    statHighestRating: 'Höchste Wertung',
    statLowestRating: 'Niedrigste Wertung',
    cardRecentEvents: 'Letzte Turniere',

    // Event page
    back: '← Zurück',
    loadingEvent: 'Turnierdaten werden geladen…',
    statInitial: 'Startwertung',
    statChange: 'Änderung',
    statFinal: 'Endwertung',
    statRecord: 'Bilanz',
    matches: 'Spiele',
    matchesPlayed: (n) => `${n} gespielt`,
    colResult: 'Ergebnis',
    colOpponent: 'Gegner',
    colOppRating: 'Gegnerwertung',
    colPtChange: 'Punktänderung',
    colScore: 'Spielstand',
    noMatchData: 'Keine Spieldaten für diesen Spieler verfügbar.',

    // History table
    noRatingHistory: 'Kein Wertungsverlauf verfügbar',
    colDate: 'Datum',
    colEvent: 'Turnier',

    // Match table
    record: 'Bilanz:',
    filterByOpponent: 'Nach Gegner filtern…',
    filterAll: 'Alle',
    filterWins: 'Nur Siege',
    filterLosses: 'Nur Niederlagen',
    noMatchesFound: 'Keine Spiele gefunden',
    matchCount: (n) => `${n} Spiel${n !== 1 ? 'e' : ''}`,
    colRatingHeader: 'Wertung',

    // Head-to-head
    h2hTitle: 'Direkte Duelle',
    noH2HData: 'Keine Duell-Daten verfügbar',
    colMatches: 'Spiele',
    colWins: 'S',
    colLosses: 'N',
    colWinPct: 'Siegquote',

    // Chart
    chartRating: 'Wertung',
    chartUpperBand: 'Wertung ±1 SD (oben)',
    chartLowerBand: 'Wertung ±1 SD (unten)',
    chartTooltipRating: (r, c) => `Wertung: ${r} (Änderung: ${c})`,
    noHistoryData: 'Keine Verlaufsdaten verfügbar',
  },
};

export const t = derived(lang, $lang => translations[$lang]);
