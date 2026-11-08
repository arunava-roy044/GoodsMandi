// Time labels for chat, like WhatsApp: "14:05" today, "Yesterday", weekday this week, else a date.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / MS_PER_DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-IN', { weekday: 'long' });
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

// Short label for the conversation list
export function chatTimeLabel(iso: string): string {
  const label = dayLabel(iso);
  return label === 'Today' ? messageTime(iso) : label;
}

export function isSameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}
