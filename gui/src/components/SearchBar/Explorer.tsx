import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@ethui/ui/components/shadcn/command";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { isAddress, isHash } from "viem";
import { useIsContract } from "#/hooks/useIsContract";
import { useContracts } from "#/store/useContracts";
import { useNetworks } from "#/store/useNetworks";
import { truncateHex } from "#/utils";

interface ExplorerSearchResultsProps {
  search: string;
  onClose: () => void;
}

interface HintItemProps {
  title: string;
  subtitle: string;
}

export function ExplorerSearchResults({
  search,
  onClose,
}: ExplorerSearchResultsProps) {
  if (!search) return null;

  const showAddressResults = isAddress(search);
  const showTransactionResults = isHash(search);

  if (!showAddressResults && !showTransactionResults) return null;

  return (
    <>
      {showAddressResults && (
        <AddressSearchResults
          address={search as `0x${string}`}
          onClose={onClose}
        />
      )}
      {showTransactionResults && (
        <TransactionSearchResults hash={search} onClose={onClose} />
      )}
      <CommandSeparator />
    </>
  );
}

export function ExplorerHints() {
  return (
    <CommandGroup heading="Explorer">
      <CommandItem disabled>
        <HintItem
          title="Search for Transactions"
          subtitle="Enter any transaction hash"
        />
      </CommandItem>
      <CommandItem disabled>
        <HintItem title="Search for Addresses" subtitle="Enter any address" />
      </CommandItem>
    </CommandGroup>
  );
}

function AddressSearchResults({
  address,
  onClose,
}: {
  address: `0x${string}`;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const network = useNetworks((s) => s.current);
  const contracts = useContracts((s) => s.contracts);
  const { isContract, isLoading } = useIsContract(
    address,
    network?.id.chain_id ?? 1,
  );

  const contractExists = contracts.some(
    (contract) => contract.address.toLowerCase() === address.toLowerCase(),
  );

  const handleAddressSelect = () => {
    navigate({ to: "/home/explorer/addresses/$address", params: { address } });
    onClose();
  };

  const handleContractSelect = () => {
    navigate({
      to: "/home/explorer/contracts/$chainId/$address",
      params: { chainId: network?.id.chain_id?.toString(), address },
    });
    onClose();
  };

  return (
    <CommandGroup heading="Explorer">
      <CommandItem
        value={address}
        keywords={[address, "address", "addresses", "explorer"]}
        onSelect={handleAddressSelect}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        <SearchResultItem
          title={`Addresses > ${truncateHex(address)}`}
          subtitle="View address details"
        />
      </CommandItem>

      {!isLoading && isContract && contractExists && (
        <CommandItem
          value={`${address}-contract`}
          keywords={[address, "contract", "contracts", "explorer"]}
          onSelect={handleContractSelect}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          <SearchResultItem
            title={`Contracts > ${truncateHex(address)}`}
            subtitle="View contract details"
          />
        </CommandItem>
      )}
    </CommandGroup>
  );
}

function TransactionSearchResults({
  hash,
  onClose,
}: {
  hash: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleTransactionSelect = () => {
    navigate({
      to: "/home/explorer/transactions/$transaction",
      params: { transaction: hash },
    });
    onClose();
  };

  return (
    <CommandGroup heading="Explorer">
      <CommandItem
        value={hash}
        keywords={[
          hash,
          "transaction",
          "transactions",
          "tx",
          "hash",
          "explorer",
        ]}
        onSelect={handleTransactionSelect}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        <SearchResultItem
          title={`Transactions > ${truncateHex(hash)}`}
          subtitle="View transaction details"
        />
      </CommandItem>
    </CommandGroup>
  );
}

function SearchResultItem({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-0">
      <span className="text-sm">{title}</span>
      <span className="text-muted-foreground text-xs">{subtitle}</span>
    </div>
  );
}

function HintItem({ title, subtitle }: HintItemProps) {
  return (
    <div className="flex flex-col gap-0">
      <span className="text-sm">{title}</span>
      <span className="text-muted-foreground text-xs">{subtitle}</span>
    </div>
  );
}
