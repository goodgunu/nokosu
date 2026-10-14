import { LineConnectScreen } from "@/components/line-connect-screen";

export default async function LineConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <LineConnectScreen code={code || ""} />;
}
