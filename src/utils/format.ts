const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// The value written to the device: "Name & Buddy"
export function composeMessage(name: string, buddy: string): string {
  const me = name.trim();
  const friend = buddy.trim();
  if (!me) return '';
  return friend ? `${me} & ${friend}` : me;
}

// "John Doe - Your grade is D." -> "D"
export function parseGrade(text: string): string | null {
  const match = /grade\s*(?:is|:)?\s*([A-F][+-]?)(?![A-Za-z])/i.exec(text);
  return match ? match[1].toUpperCase() : null;
}
