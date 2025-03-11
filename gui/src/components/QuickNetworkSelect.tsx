import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { useShallow } from "zustand/shallow";

import { ChainView } from "@ethui/ui/components/chain-view";
import { useNetworks } from "#/store/useNetworks";

export function QuickNetworkSelect() {
  const [networks, current, setCurrent] = useNetworks(
    useShallow((s) => [s.networks, s.current, s.setCurrent]),
  );

  if (!networks || !current) return <>Loading</>;

  return (
    <Select value={current.name} onValueChange={setCurrent}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {networks.map(({ dedup_chain_id: { chain_id }, name }) => (
            <SelectItem value={name} key={name}>
              <ChainView chainId={chain_id} name={name} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
