export function Wordmark({ height = 26 }: { height?: number }) {
  return (
    <span className="font-sans leading-none font-bold tracking-tight text-white" style={{ fontSize: Math.round(height * 0.78) }}>
      のこす
    </span>
  );
}

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-lg font-sans font-bold text-white"
      style={{ background: "#E4682C", width: size, height: size, fontSize: Math.round(size * 0.62) }}
    >
      の
    </span>
  );
}
