import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ethui/ui/components/shadcn/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ethui/ui/components/shadcn/popover";
import { type Abi, type AbiFunction, formatAbiItem } from "abitype";
import { Fragment, useState } from "react";
import type { Address } from "viem";

import { CaretSortIcon } from "@radix-ui/react-icons";
import { useInvoke } from "#/hooks/useInvoke";
import { ABIItemForm } from "./ABIItemForm";
import { Badge } from "@ethui/ui/components/shadcn/badge";

export { ABIItemForm };

interface Props {
  chainId: number;
  address: Address;
}

type Option =
  | "raw"
  | {
    item: AbiFunction;
    label: string;
    group: string;
    id: number;
  };

export function ABIForm({ chainId, address }: Props) {
  const { data: abi } = useInvoke<Abi>("db_get_contract_abi", {
    address,
    chainId,
  });

  const options = (abi || [])
    .filter(({ type }) => type === "function")
    .map((item, i) => {
      const abiItem = item as AbiFunction;
      return {
        item: abiItem as AbiFunction,
        label: formatAbiItem(abiItem).replace("function ", ""),
        group: abiItem.stateMutability === "view" ? "view" : "write",
        id: i,
      };
    })
    .sort((a, b) => -a.group.localeCompare(b.group));

  const [current, setCurrent] = useState<Option | undefined>(options[0]);
  const [dropdownOpen, setDropdownOpen] = useState(true);

  return (
    <div className="m-1 flex flex-col items-start gap-4">
      <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full p-6">
            {current === "raw" && "raw"}
            {current && current !== "raw" && (
              <>
                <Badge>{current.item.stateMutability}</Badge>
                {current.label}
              </>
            )}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full">
          <Command>
            <CommandInput placeholder="Search" />
            <CommandList>
              <CommandEmpty>No items found</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    onSelect={() => {
                      setCurrent(option);
                      setDropdownOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Badge>{option.item.stateMutability}</Badge>
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Raw">
                <CommandItem
                  onSelect={() => {
                    setCurrent("raw");
                    setDropdownOpen(false);
                  }}
                >
                  <span>Raw</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {current && (
        <Fragment key={JSON.stringify(current)}>
          <ABIItemForm
            to={address}
            abiItem={current !== "raw" ? current.item : undefined}
          />
        </Fragment>
      )}
    </div>
  );
}
