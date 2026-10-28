// LINE連携の結果を、ユーザー向けの短い日本語にする

export const LINE_ALREADY_USED_MESSAGE =
  "このLINEアカウントは、別ののこすのアカウントですでに使われています。";

export const LINE_UNAVAILABLE_MESSAGE =
  "このアカウントではLINE連携できません。ログインし直してから、もう一度お試しください。";

export const LINE_LINKED_MESSAGE = "LINEを連携しました。";

export const LINE_DENIED_MESSAGE = "LINEの連携がキャンセルされました。";

export function messageForLineLinkFlag(flag: string | null | undefined): string | null {
  if (flag === "conflict") return LINE_ALREADY_USED_MESSAGE;
  if (flag === "unavailable") return LINE_UNAVAILABLE_MESSAGE;
  if (flag === "denied") return LINE_DENIED_MESSAGE;
  if (flag === "linked") return LINE_LINKED_MESSAGE;
  return null;
}
