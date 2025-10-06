import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@ethui/ui/components/shadcn/command";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { type Address, isAddress, isHash } from "viem";
import { useAllAddresses } from "#/hooks/useAllAddresses";
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
  const showAddressResults = search.startsWith("0x") && search.length >= 3;
  const showTransactionResults = isHash(search);
  const showHints = !search || search === "0" || search === "0x";

  return (
    <CommandGroup heading="Explorer">
      {showHints && <ExplorerHints />}

      {showAddressResults && (
        <AddressSearchResults searchTerm={search} onClose={onClose} />
      )}
      {showTransactionResults && (
        <TransactionSearchResults hash={search} onClose={onClose} />
      )}

      {(showAddressResults || showTransactionResults || showHints) && (
        <CommandSeparator />
      )}
    </CommandGroup>
  );
}

function ExplorerHints() {
  return (
    <>
      <CommandItem keywords={["0", "0x"]} disabled>
        <HintItem
          title="Search for Transactions"
          subtitle="Enter any transaction hash"
        />
      </CommandItem>
      <CommandItem keywords={["0", "0x"]} disabled>
        <HintItem
          title="Search for Addresses"
          subtitle="Enter full address or partial"
        />
      </CommandItem>
    </>
  );
}

function AddressSearchResults({
  searchTerm,
  onClose,
}: {
  searchTerm: string;
  onClose: () => void;
}) {
  const network = useNetworks((s) => s.current);
  const isExactAddress = isAddress(searchTerm);

  const { data: addressData } = useAllAddresses({
    enabled: !isExactAddress,
    searchTerm: !isExactAddress ? searchTerm : undefined,
  });

  if (!network) return null;

  const matchingAddresses = isExactAddress
    ? [searchTerm as `0x${string}`]
    : addressData?.all.map((data) => data.address as Address) || [];

  if (matchingAddresses.length === 0) return null;

  return (
    <>
      {matchingAddresses.map((address) => (
        <AddressCommandItems
          key={address}
          address={address as Address}
          chainId={network.id.chain_id}
          onClose={onClose}
        />
      ))}
    </>
  );
}

function AddressCommandItems({
  address,
  chainId,
  onClose,
}: {
  address: `0x${string}`;
  chainId: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const contracts = useContracts((s) => s.contracts);
  const { isContract, isLoading } = useIsContract(address, chainId);

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
      params: { chainId: chainId.toString(), address },
    });
    onClose();
  };

  return (
    <>
      <CommandItem
        className="cursor-pointer"
        value={`address-${address}`}
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
          className="cursor-pointer"
          value={`contract-${address}`}
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
    </>
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
    <CommandItem
      className="cursor-pointer"
      value={hash}
      keywords={[hash, "transaction", "transactions", "tx", "hash", "explorer"]}
      onSelect={handleTransactionSelect}
    >
      <ExternalLink className="mr-2 h-4 w-4" />
      <SearchResultItem
        title={`Transactions > ${truncateHex(hash)}`}
        subtitle="View transaction details"
      />
    </CommandItem>
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
