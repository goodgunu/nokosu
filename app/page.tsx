import { Library } from "@/components/library";

export default function HomePage() {
  return <Library lineReady={Boolean(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN)} />;
}
