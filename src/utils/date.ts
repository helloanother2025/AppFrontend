export const formatRideDate = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `${day} at ${time}`;
};

export const parseServerDate = (dateStr: string) => {
  if (!dateStr) return null;
  return new Date(dateStr);
};
