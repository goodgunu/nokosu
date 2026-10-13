import { FromLineScreen } from "@/components/from-line-screen";

export default async function FromLinePage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return <FromLineScreen url={url || ""} />;
}
