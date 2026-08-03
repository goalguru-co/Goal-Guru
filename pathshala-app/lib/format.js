// Returns true only if the string looks like an actual absolute URL.
// Used to decide whether a stored value should render as a clickable link
// or as plain text — prevents treating a plain-text answer (e.g. "done")
// as a relative URL, which 404s when clicked.
export function isLikelyUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Title-cases a name for display only — never mutates stored data.
// "jai patil" -> "Jai Patil"
export function titleCase(value) {
  if (!value) return value;
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
