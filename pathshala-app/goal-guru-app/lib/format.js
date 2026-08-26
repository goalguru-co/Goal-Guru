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

// Normalizes to the last 10 digits, so "+91 83290 42495", "8329042495", and
// "832-904-2495" all match each other regardless of how each was typed.
export function normalizePhone(p) {
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
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
