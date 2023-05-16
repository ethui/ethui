import { useInvoke } from "../hooks/tauri";
import { Network } from "../types";
import Panel from "./Panel";

interface Props {
  children: React.ReactNode;
  devOnly?: boolean;
}

export function LivenetPlaceholder({ children, devOnly }: Props) {
  const { data } = useInvoke<Network>("get_current_network");

  if (!devOnly || data?.dev) {
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
