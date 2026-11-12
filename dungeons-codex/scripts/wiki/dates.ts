/** Dates as the wiki writes them → ISO `YYYY-MM-DD`. */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** `"July 1, 2020"`, `"December 14th 2021"`, `"1 July 2020"` → `"2020-07-01"`; else `undefined`. */
export function parseWikiDate(text: string): string | undefined {
  const clean = text.replace(/(\d)(?:st|nd|rd|th)\b/gi, '$1').replace(/,/g, ' ');
  const monthFirst = /([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/.exec(clean);
  const dayFirst = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(clean);
  const [month, day, year] = monthFirst
    ? [monthFirst[1], monthFirst[2], monthFirst[3]]
    : dayFirst
      ? [dayFirst[2], dayFirst[1], dayFirst[3]]
      : [];
  const index = MONTHS.indexOf((month ?? '').toLowerCase());
  if (index === -1 || !day || !year) return undefined;
  const dayNumber = Number(day);
  if (dayNumber < 1 || dayNumber > 31) return undefined;
  return `${year}-${String(index + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
}
