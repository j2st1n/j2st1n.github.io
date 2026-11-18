export function addUnicodeRanges(points, ranges) {
  for (const range of ranges.split(",")) {
    const [first, last = first] = range.trim().slice(2).split("-");
    const end = Number.parseInt(last, 16);
    for (let point = Number.parseInt(first, 16); point <= end; point++)
      points.add(point);
  }
}

export function uncoveredHan(html, covered) {
  const description =
    html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? "";
  const pageText = html.replace(
    /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-z][^>]*>/gi,
    " "
  );
  const text = (description + " " + pageText).replace(
    /&#(x[\da-f]+|\d+);/gi,
    (entity, value) => {
      const point = Number(
        value[0].toLowerCase() === "x" ? "0" + value : value
      );
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
  );
  return new Set(
    (text.match(/\p{Unified_Ideograph}/gu) ?? [])
      .map(char => char.codePointAt(0))
      .filter(point => !covered.has(point))
  );
}
