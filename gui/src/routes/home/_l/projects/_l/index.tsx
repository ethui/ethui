import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Input } from "@ethui/ui/components/shadcn/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ethui/ui/components/shadcn/tooltip";
import { createFileRoute, Link } from "@tanstack/react-router";
import debounce from "lodash-es/debounce";
import { MoveRight, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Abi, Address } from "viem";
import { AddressView } from "#/components/AddressView";
import { EmptyState } from "#/components/EmptyState";
import { ProjectAccordion } from "#/components/ProjectAccordion";
import { useInvoke } from "#/hooks/useInvoke";
import { type OrganizedContract, useContracts } from "#/store/useContracts";

export const Route = createFileRoute("/home/_l/projects/_l/")({
  component: Contracts,
});

function Contracts() {
  const [filter, setFilter] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Subscribe to contracts and grouping function
  const groupedContracts = useContracts((s) => s.groupedContracts);
  const contracts = useContracts((s) => s.contracts);
  const projects = useContracts((s) => s.projects);

  // Memoize groups based on contracts and filter
  const groups = useMemo(
    () => groupedContracts(filter),
    [groupedContracts, filter, contracts, projects],
  );

  // Memoize project paths (used as keys) - will only change when groups actually change
  const projectKeys = useMemo(
    () => groups.map((g) => g.projectPath || g.projectName),
    [groups],
  );

  // Check if all groups have 0 contracts total
  const totalContracts = groups.reduce((sum, g) => sum + g.contracts.length, 0);
  const hasProjects = groups.length > 0;

  // Manage expanded items
  useEffect(() => {
    setExpandedItems((prev) => {
      const currentProjectKeys = new Set(projectKeys);
      const validItems = prev.filter((key) => currentProjectKeys.has(key));

      // Auto-expand all when filter is active
      if (filter) {
        // Only update if not already showing all projects
        if (
          prev.length === projectKeys.length &&
          prev.every((key) => currentProjectKeys.has(key))
        ) {
          return prev;
        }
        return projectKeys;
      }

      // Clean up stale project keys when filter is inactive
      if (validItems.length !== prev.length) {
        return validItems;
      }

      return prev;
    });
  }, [filter, projectKeys]);

  // Determine what to show
  const showEmptyState = !hasProjects || (totalContracts === 0 && filter);

  return (
    <>
      <Filter onChange={(f) => setFilter(f)} />

      {showEmptyState ? (
        <EmptyState
          message={
            !hasProjects
              ? "No projects found"
              : "No matching contracts"
          }
          description={
            !hasProjects
              ? "Make sure you have a Foundry or Hardhat project in the configured path. Check your ABI watch path in settings."
              : `No contracts match "${filter}". Try a different search term.`
          }
        />
      ) : (
        <>
          <ResultCount count={totalContracts} isFiltering={!!filter} />

          <div className="flex flex-col gap-2 pt-2">
            <ProjectAccordion
              groups={groups}
              expandedItems={expandedItems}
              onExpandedChange={setExpandedItems}
              renderContract={(contract) => (
                <ContractHeader key={contract.address} contract={contract} />
              )}
            />
          </div>
        </>
      )}
    </>
  );
}

function ResultCount({
  count,
  isFiltering,
}: {
  count: number;
  isFiltering: boolean;
}) {
  return (
    <div className="px-2 py-1 text-muted-foreground text-sm">
      <span aria-live="polite" aria-atomic="true">
        {isFiltering
          ? `${count} contract${count !== 1 ? "s" : ""} found`
          : "\u00A0"}
      </span>
    </div>
  );
}

function Filter({ onChange }: { onChange: (f: string) => void }) {
  const [inputValue, setInputValue] = useState("");

  const debouncedOnChange = useMemo(
    () => debounce((value: string) => onChange(value), 300),
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedOnChange(value);
  };

  const handleClear = () => {
    setInputValue("");
    debouncedOnChange.cancel();
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
    }
  };

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <form className="mx-2 flex items-center gap-1">
      <div className="relative w-full">
        <Input
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Filter..."
          className="h-10 pr-8"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-translate-y-1/2 absolute top-1/2 right-1 h-7 w-7"
            onClick={handleClear}
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

function ContractHeader({ contract }: { contract: OrganizedContract }) {
  const { address, name, chainId, proxyChain } = contract;
  const { data: abi } = useInvoke<Abi>("db_get_contract_impl_abi", {
    address,
    chainId,
  });

  const hasAbi = abi && abi.length > 0;

  return (
    <div className="group flex w-full flex-nowrap overflow-hidden hover:bg-accent">
      <div className="mr-4 grow">
        <Link
          to="/home/projects/$chainId/$address"
          params={{ address: address, chainId: chainId }}
          className="flex whitespace-nowrap p-4 align-baseline"
        >
          <div className="flex w-full items-center gap-2">
            <AddressView showLinkExplorer={false} address={address} />

            <div className="flex items-center gap-1">
              {name && <Badge variant="secondary">{name}</Badge>}

              {proxyChain.map(({ address, name }) => (
                <div key={address} className="flex items-center gap-2">
                  <MoveRight strokeWidth={1} size={16} />
                  {name ? (
                    <Badge variant="secondary">{name}</Badge>
                  ) : (
                    <AddressView
                      address={address}
                      noTextStyle
                      showLinkExplorer={false}
                    />
                  )}
                </div>
              ))}

              {!hasAbi && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="gap-1 border-yellow-600 text-yellow-600 dark:border-yellow-500 dark:text-yellow-500"
                      >
                        <TriangleAlert className="h-3 w-3" />
                        No ABI
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>No ABI found, check your foundry settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </Link>
      </div>

      <div className="flex min-w-[50px] items-center justify-end pr-2 group-hover:flex">
        <DeleteContractButton address={address} chainId={chainId} />
      </div>
    </div>
  );
}

interface DeleteContractButtonPropsProps {
  address: Address;
  chainId: number;
}

function DeleteContractButton({
  address,
  chainId,
}: DeleteContractButtonPropsProps) {
  const [deleting, setDeleting] = useState(false);
  const removeContract = useContracts((s) => s.removeContract);

  if (!deleting) {
    return (
      <Button
        key="delete"
        variant="ghost"
        className="h-13 w-12"
        onClick={() => setDeleting(true)}
      >
        <Trash2 />
      </Button>
    );
  } else {
    return (
      <div className="flex items-center justify-stretch">
        <Button
          key="delete-confirm"
          variant="destructive"
          className="flex"
          onClick={() => removeContract(chainId, address)}
          onMouseOut={() => setDeleting(false)}
          onBlur={() => setDeleting(false)}
        >
          Sure?
        </Button>
      </div>
    );
  }
}
