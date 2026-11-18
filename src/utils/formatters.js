export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

export function formatMs(ms) {
  if (ms === null || ms === undefined) return '0 ms';
  return `${Math.round(ms)} ms`;
}

export function formatPercent(pct) {
  if (pct === null || pct === undefined) return '0%';
  return `${Math.min(100, Math.max(0, Math.round(pct)))}%`;
}

export function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  const d = new Date(timestamp);
  return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function formatShortDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function truncateId(id, len = 8) {
  if (!id) return '';
  return id.length > len ? id.substring(0, len) + '…' : id;
}
