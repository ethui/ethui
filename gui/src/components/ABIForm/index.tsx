import { type Abi, type AbiFunction, formatAbiItem } from "abitype";
import { Fragment, useState } from "react";
import type { Address } from "viem";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ethui/ui/components/shadcn/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@ethui/ui/components/shadcn/command";
import { Button } from "@ethui/ui/components/shadcn/button";

import { useInvoke } from "#/hooks/useInvoke";
import { ABIItemForm } from "./ABIItemForm";
import { CaretSortIcon } from "@radix-ui/react-icons";

export { ABIItemForm };

interface Props {
  chainId: number;
  address: Address;
}

export function ABIForm({ chainId, address }: Props) {
  const [currentItem, setCurrentItem] = useState<
    AbiFunction | "raw" | undefined
  >();

  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address,
    chainId,
  });

  if (!abi) return null;

  const options = abi
    .filter(({ type }) => type === "function")
    .map((item, i) => {
      const abiItem = item as AbiFunction;
      return {
        item: abiItem as AbiFunction | "raw",
        label: formatAbiItem(abiItem).replace("function ", ""),
        group: abiItem.stateMutability === "view" ? "view" : "write",
        id: i,
      };
    })
    .concat([
      {
        item: "raw",
        label: "Raw",
        group: "Raw",
        id: -1,
      },
    ])
    .sort((a, b) => -a.group.localeCompare(b.group));

  return (
    <div className="m-1 flex flex-col items-start gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full">
            foo
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full">
          <Command>
            <CommandInput placeholder="Search" />
            <CommandList>
              <CommandEmpty>No items found</CommandEmpty>
              <CommandGroup>
                {options.map(({ item, label, id }) => (
                  <CommandItem key={id} onSelect={() => setCurrentItem(item)}>
                    {item !== "raw" && item.stateMutability}
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {currentItem && (
        <Fragment key={JSON.stringify(currentItem)}>
          <ABIItemForm
            to={address}
            abiItem={currentItem !== "raw" ? currentItem : undefined}
          />
        </Fragment>
      )}
    </div>
  );
}
