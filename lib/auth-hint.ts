// ログインしていそうか（クッキーの有無だけで見る目安）。
// ログイン前のトップをすぐ出すために使う。本当にログインしているかは /api/auth で確かめる。
// - Clerk：__session / __client_uat（ログアウト中の __client_uat は "0"）。名前の後ろに _xxxx が付くこともある
// - LINE・Yahoo!：nokosu_session は HttpOnly で読めないので、目安用の nokosu_signed_in を別に置く
export const SIGNED_IN_HINT_COOKIE = "nokosu_signed_in";
export const AUTH_PENDING_CLASS = "nokosu-auth-pending";

const HINT_SOURCE = `function(c){return c.split(";").some(function(p){var i=p.indexOf("="),k=p.slice(0,i).trim(),v=p.slice(i+1).trim();if(!v)return false;if(k==="${SIGNED_IN_HINT_COOKIE}")return v==="1";if(k==="__session"||k.indexOf("__session_")===0)return true;if(k==="__client_uat"||k.indexOf("__client_uat_")===0)return v!=="0";return false})}`;

// 画面が動き出す前（hydration 前）に html に印を付ける、いちばん最初に動く小さなスクリプト
export const AUTH_HINT_SCRIPT = `try{if((${HINT_SOURCE})(document.cookie))document.documentElement.classList.add("${AUTH_PENDING_CLASS}")}catch(e){}`;

export function looksSignedIn(cookie: string = typeof document === "undefined" ? "" : document.cookie): boolean {
  return cookie.split(";").some((part) => {
    const i = part.indexOf("=");
    if (i < 0) return false;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!value) return false;
    if (key === SIGNED_IN_HINT_COOKIE) return value === "1";
    if (key === "__session" || key.startsWith("__session_")) return true;
    if (key === "__client_uat" || key.startsWith("__client_uat_")) return value !== "0";
    return false;
  });
}

export function signedInHintCookie(on: boolean, secure: boolean): string {
  const parts = [`${SIGNED_IN_HINT_COOKIE}=${on ? "1" : ""}`, "Path=/", "SameSite=Lax", `Max-Age=${on ? 5184000 : 0}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
