export function parseCsvText(text, maxRows = Number.POSITIVE_INFINITY) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], separator: null };
  }

  const separator = detectSeparator(lines[0]);
  const headers = lines[0].split(separator);
  const rowLines = Number.isFinite(maxRows) ? lines.slice(1, 1 + maxRows) : lines.slice(1);
  const rows = rowLines.map((line) => line.split(separator));
  return { headers, rows, separator };
}

function detectSeparator(headerLine) {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}
