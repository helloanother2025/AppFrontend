export const parseServerDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const str = String(value).trim();
  let normalized = str;

  const dateTimeMatch = str.match(
    /^([0-9]{4}-[0-9]{2}-[0-9]{2})[ T]([0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?)(.*)$/
  );

  if (dateTimeMatch) {
    const datePart = dateTimeMatch[1];
    const timePart = dateTimeMatch[2];
    let tzPart = dateTimeMatch[3]?.trim() || '';

    if (tzPart) {
      if (/^[+-]\d{2}$/.test(tzPart)) {
        tzPart = `${tzPart}:00`;
      } else if (/^[+-]\d{4}$/.test(tzPart)) {
        tzPart = `${tzPart.slice(0, 3)}:${tzPart.slice(3)}`;
      }
    }

    if (!tzPart) {
      tzPart = 'Z';
    }

    normalized = `${datePart}T${timePart}${tzPart}`;
  } else {
    const hasTimezone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(str);
    if (!hasTimezone) {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
        normalized = str.replace(' ', 'T');
      }
      normalized = `${normalized}Z`;
    }
  }
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};
