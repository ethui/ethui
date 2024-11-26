import clsx from "clsx";

interface Props {
  size?: number;
  attention?: boolean;
  dev?: boolean;
  fg?: string;
  bg?: string;
}

export function EthuiLogo({
  size = 40,
  attention,
  dev,
  fg = "fill-background",
  bg = "fill-foreground",
}: Props) {
  return (
    <svg
      width={size.toString()}
      height={size.toString()}
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>ethui logo</title>
      <Background color={clsx(bg || (dev ? "fill-dev" : "fill-background"))} />
      <DiamondTop color={fg} />
      <DiamondBottom color={fg} />
      {attention && <Attention color="fill-destructive" />}
    </svg>
  );
}

function Background({ color }: { color: string }) {
  return <path d="M0 0L600 0L600 599.997L0 599.997L0 0Z" className={color} />;
}

function DiamondTop({ color = "fill-foreground" }: { color?: string }) {
  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M492.005 372L300.005 114L108.005 372H217.239L300.005 260.783L382.771 372H492.005Z"
      className={color}
    />
  );
}

function DiamondBottom({ color }: { color: string }) {
  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M216.005 372L300.005 486L384.005 372L336.215 372L300.005 421.142L263.795 372L216.005 372Z"
      className={color}
    />
  );
}

function Attention({ color }: { color: string }) {
  return <path d="M600 0V372H492L300 114V0H600Z" className={color} />;
}
