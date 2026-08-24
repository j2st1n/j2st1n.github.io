const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timezone: string) => {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    formatterCache.set(timezone, formatter);
  }
  return formatter;
};

const getDateParts = (date: string | Date, timezone: string) => {
  const parts = Object.fromEntries(
    getFormatter(timezone)
      .formatToParts(new Date(date))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value])
  );

  return {
    year: parts.year,
    month: Number(parts.month),
    day: Number(parts.day),
  };
};

export const formatFullDate = (date: string | Date, timezone: string) => {
  const { year, month, day } = getDateParts(date, timezone);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
};

export const formatYear = (date: string | Date, timezone: string) =>
  getDateParts(date, timezone).year;

export const formatMonth = (date: string | Date, timezone: string) =>
  `${getDateParts(date, timezone).month}月`;

export const formatDay = (date: string | Date, timezone: string) =>
  `${getDateParts(date, timezone).day}日`;
