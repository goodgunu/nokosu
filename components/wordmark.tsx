import Image from "next/image";

export function Wordmark({ height = 28 }: { height?: number }) {
  const width = Math.round(height * (925 / 361));
  return <Image src="/wordmark.png" alt="のこす" width={width} height={height} priority />;
}

export function Mark({ size = 40 }: { size?: number }) {
  const inner = Math.round(size * 0.78);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl"
      style={{ width: size, height: size, background: "#E4682C" }}
    >
      <Image src="/mark.png" alt="" width={inner} height={inner} />
    </span>
  );
}
