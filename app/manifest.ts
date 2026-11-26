import type { MetadataRoute } from "next";

// ホーム画面に追加した時の名前・色・アイコン（色は globals.css の --orange / --background）
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "のこす｜気になった中古車を、消える前に残す",
    short_name: "のこす",
    description:
      "カーセンサー・グーネット・カババ・ヤフオクの中古車掲載を、掲載終了の前に自分のアカウントへ残すメモ。値下げや掲載終了はLINEでお知らせします。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f7",
    theme_color: "#e4682c",
    // app/icon.png（512×512）は /icon.png で配信されます
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
