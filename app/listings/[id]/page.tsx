import { ListingScreen } from "@/components/listing-screen";

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pick?: string }>;
}) {
  const { id } = await params;
  const { pick } = await searchParams;
  return <ListingScreen id={id} startPicking={pick === "1"} />;
}
