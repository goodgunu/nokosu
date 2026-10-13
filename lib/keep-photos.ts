export const PHOTO_KEEP_LIMIT = 40;

export function choosePhotoIndexes(length: number, indexes: readonly number[], limit = PHOTO_KEEP_LIMIT): number[] {
  const chosen: number[] = [];
  const seen = new Set<number>();
  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 0 || index >= length || seen.has(index)) continue;
    seen.add(index);
    chosen.push(index);
    if (chosen.length >= limit) break;
  }
  return chosen;
}
