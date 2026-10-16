import { fetchListing } from "@/lib/fetch-listing";
import { currentUser, unauthorized } from "@/lib/current-user";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!(await currentUser(request))) return unauthorized();
    return await archiveListing(request);
  } catch {
    return Response.json(
      { status: "error", message: "保存処理が途中で止まったので、もう一度試してください。" },
      { status: 500 },
    );
  }
}

async function archiveListing(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "error", message: "URLを読み取れませんでした。" }, { status: 400 });
  }

  if (typeof body.url !== "string") {
    return Response.json(
      { status: "error", message: "中古車の詳細ページのURLを貼ってください。" },
      { status: 400 },
    );
  }

  const { parsed, httpStatus } = await fetchListing(body.url);
  return Response.json(parsed, { status: parsed.status === "ok" || parsed.status === "ended" ? 200 : httpStatus });
}
