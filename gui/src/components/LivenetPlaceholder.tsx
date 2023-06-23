import { useNetworks } from "../store";
import { Panel } from "./";

interface Props {
  children: React.ReactNode;
  devOnly?: boolean;
}

export function LivenetPlaceholder({ children, devOnly }: Props) {
  const chainId = useNetworks((s) => s.current?.chain_id);

  if (!devOnly || chainId === 31337) {
    return <>{children}</>;
  }

  return (
    <Panel>
      Iron doesn&apos;t yet display information from livenets. We&apos;re sorry
      for that.
      <br />
      We share your frustration, and will be fixing it soon.
    </Panel>
  );
}
