export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  location?: string;
};

const foldLine = (line: string) => {
  if (line.length <= 74) {
    return line;
  }

  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 74) {
    chunks.push(i === 0 ? line.slice(i, i + 74) : ` ${line.slice(i, i + 74)}`);
  }
  return chunks.join("\r\n");
};

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const formatUtcDate = (date: Date) => {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
    date.getUTCSeconds()
  )}Z`;
};

export const createIcsFileContent = (
  events: IcsEvent[],
  calendarName = "EthioTime"
) => {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EthioTime//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];

  for (const event of events) {
    const end = event.end ?? new Date(event.start.getTime() + 60 * 60 * 1000);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcs(event.uid)}`);
    lines.push(`DTSTAMP:${formatUtcDate(new Date())}`);
    lines.push(`DTSTART:${formatUtcDate(event.start)}`);
    lines.push(`DTEND:${formatUtcDate(end)}`);
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);

    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcs(event.description)}`));
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeIcs(event.location)}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

export const downloadIcsContent = (filename: string, content: string) => {
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
