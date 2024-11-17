import { useState, useEffect } from "react";
import { formatAbiItem, type Abi, type AbiFunction } from "abitype";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ethui/ui/components/shadcn/command";
import { Badge } from "@ethui/ui/components/shadcn/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ethui/ui/components/shadcn/popover";
import { Button } from "@ethui/ui/components/shadcn/button";
import { CaretSortIcon } from "@radix-ui/react-icons";

interface Option {
  item: AbiFunction | "raw";
  label: string;
  id: number;
}

const VALID_TYPES = ["function", "receive", "fallback"];
const GROUPS = ["view", "write", "fallback", "raw"];
type Group = (typeof GROUPS)[number];

type GroupedOptions = Record<Group, Option[]>;

interface AbiItemSelectProps {
  abi: Abi;
  onChange: (item: AbiFunction | "raw" | undefined) => void;
}

export function AbiItemSelect({ abi, onChange }: AbiItemSelectProps) {
  const [groupedOptions, setGroupedOptions] = useState<GroupedOptions>({});
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [current, setCurrent] = useState<Option | undefined>();

  useEffect(() => onChange(current?.item), [current, onChange]);
  useEffect(() => setGroupedOptions(constructOptions(abi)), [abi]);

  return (
    <div className="m-1 flex flex-col items-start gap-4">
      <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full p-6">
            {current?.item === "raw" && "raw"}
            {current && current.item !== "raw" && (
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
              {GROUPS.map((group) => {
                const options = groupedOptions[group];

                if (!options?.length) {
                  return;
                }

                return (
                  <CommandGroup key={group} heading={group}>
                    {options.map((option) => (
                      <CommandItem
                        key={option.id}
                        onSelect={() => {
                          setCurrent(option);
                          setDropdownOpen(false);
                        }}
                        className="gap-2"
                      >
                        <Badge>{badgeFor(option.item)}</Badge>
                        <span>{option.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function constructOptions(abi: Abi): GroupedOptions {
  const options = (abi || [])
    .filter(({ type }) => VALID_TYPES.includes(type))
    .reduce((acc, item, id) => {
      const abiItem = item as AbiFunction;
      const group = groupFor(abiItem);
      acc[group] ||= [];
      acc[group].push({
        item: abiItem,
        label: formatAbiItem(abiItem).replace("function ", ""),
        id,
      });
      return acc;
    }, {} as GroupedOptions);

  options["raw"] = { item: "raw", label: "Raw", id: -1 };

  return options;
}

function groupFor(item: AbiFunction) {
  if (item.stateMutability === "view") {
    return "view";
  } else if (["fallback", "receive"].includes(item.type)) {
    return "fallback";
  } else {
    return "write";
  }
}

function badgeFor(item: AbiFunction | "raw") {
  if (item === "raw") {
    return "raw";
  } else {
    return item.stateMutability;
  }
}
