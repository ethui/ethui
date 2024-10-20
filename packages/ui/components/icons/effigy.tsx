export interface EffigyIconProps {
  address: string;
}

export function EffigyIcon({ address }: EffigyIconProps) {
  // TODO: seems effigi.im no longer supports ENS
  return (
    <img
      alt={`Effigy for ${address}`}
      className="h-6 w-6"
      src={`https://effigy.im/a/${address}.svg`}
    />
  );
}
