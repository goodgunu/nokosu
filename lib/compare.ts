const KEY = "nokosu-compare";

export function readCompare(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string").slice(0, 3);
  } catch {
    return [];
  }
}

export function writeCompare(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 3)));
}
