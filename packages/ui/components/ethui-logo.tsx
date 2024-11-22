import clsx from "clsx";

interface Props {
  size?: number;
  attention?: boolean;
  dev?: boolean;
}

export function EthuiLogo({ size = 40, attention, dev }: Props) {
  return (
    <svg
      width={size.toString()}
      height={size.toString()}
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>ethui logo</title>
      <Background dev={dev} />
      <DiamondTop />
      <DiamondBottom />
      {attention && <Attention />}
    </svg>
  );
}

function Background({ dev }: { dev?: boolean }) {
  return (
    <path
      d="M0 0L600 0L600 599.997L0 599.997L0 0Z"
      className={clsx(dev ? "fill-dev" : "fill-foreground")}
    />
  );
}

function DiamondTop() {
  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M492.005 372L300.005 114L108.005 372H217.239L300.005 260.783L382.771 372H492.005Z"
      className="fill-background"
    />
  );
}

function DiamondBottom() {
  return (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M216.005 372L300.005 486L384.005 372L336.215 372L300.005 421.142L263.795 372L216.005 372Z"
      className="fill-background"
    />
  );
}

function Attention() {
  return (
    <path d="M600 0V372H492L300 114V0H600Z" className="fill-destructive" />
  );
}
