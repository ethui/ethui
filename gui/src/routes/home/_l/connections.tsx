import type { Affinity, Peer } from "@ethui/types";
import type { Network } from "@ethui/types/network";
import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { map, uniqBy } from "lodash-es";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useShallow } from "zustand/shallow";
import { EmptyState } from "#/components/EmptyState";
import { useEventListener } from "#/hooks/useEventListener";
import { useInvoke } from "#/hooks/useInvoke";
import { useNetworks } from "#/store/useNetworks";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/home/_l/connections")({
  beforeLoad: () => ({
    breadcrumb: "Connections",
  }),
  component: Connections,
});

interface WcSession {
  topic: string;
  peer: {
    name: string;
    url: string;
    icons: string[];
  };
  address: string;
  expiry: number;
}

function Connections() {
  const { data: peersByDomain, refetch } =
    useInvoke<Record<string, Peer[]>>("ws_peers_by_domain");
  const { data: wcSessions, refetch: refetchWc } =
    useInvoke<WcSession[]>("wc_list_sessions");

  useEventListener({ event: "peers-updated", callback: refetch });
  useEventListener({ event: "wc-sessions-updated", callback: refetchWc });

  const hasWsBrowserConnections =
    peersByDomain && Object.keys(peersByDomain).length > 0;
  const hasWcSessions = wcSessions && wcSessions.length > 0;

  return (
    <div className="m-4 flex flex-col gap-4">
      <WalletConnectPanel onSessionChange={refetchWc} />

      {hasWcSessions && (
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">WalletConnect sessions</p>
          {wcSessions.map((s) => (
            <WcSessionRow key={s.topic} session={s} onChange={refetchWc} />
          ))}
        </div>
      )}

      {hasWsBrowserConnections && (
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">Browser connections</p>
          {map(peersByDomain, (peers, domain) => (
            <Domain key={domain} domain={domain} peers={peers} />
          ))}
        </div>
      )}

      {!hasWsBrowserConnections && !hasWcSessions && (
        <EmptyState
          message="No connections found"
          description="Connect to dApps to see them here."
        />
      )}
    </div>
  );
}

const wcPairSchema = z.object({
  uri: z.string().min(1),
});

function WalletConnectPanel({
  onSessionChange,
}: {
  onSessionChange: () => void;
}) {
  const form = useForm({
    mode: "onChange",
    resolver: zodResolver(wcPairSchema),
    defaultValues: { uri: "" },
  });

  const onSubmit = async ({ uri }: { uri: string }) => {
    try {
      await invoke("wc_pair", { uri: uri.trim() });
      form.reset({ uri: "" });
      onSessionChange();
    } catch {
      form.setError("uri", {
        message: "Pairing failed. Check the URI and try again.",
      });
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="flex flex-col gap-1">
      <Form.Text label="WalletConnect" name="uri" className="w-full" />
      <Form.Submit label="Pair" />
    </Form>
  );
}

function WcSessionRow({
  session,
  onChange,
}: {
  session: WcSession;
  onChange: () => void;
}) {
  const icon = session.peer.icons[0];
  const allWalletInfo = useWallets((s) => s.allWalletInfo);
  const accounts = uniqBy(
    (allWalletInfo || []).flatMap((w) => w.addresses),
    (a) => a.address.toLowerCase(),
  );

  const handleDisconnect = async () => {
    await invoke("wc_disconnect", { topic: session.topic });
    onChange();
  };

  const handleSwitchAccount = async (address: string) => {
    await invoke("wc_switch_account", { topic: session.topic, address });
    onChange();
  };

  return (
    <div className="flex items-center gap-1 rounded border p-2">
      {icon && (
        <img
          src={icon}
          alt={session.peer.name}
          className="h-6 w-6 rounded-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{session.peer.name}</p>
        <p className="truncate text-muted-foreground text-xs">
          {session.peer.url}
        </p>
      </div>
      <Select value={session.address} onValueChange={handleSwitchAccount}>
        <SelectTrigger className="h-8 w-36 items-center text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.address} value={a.address}>
              {a.alias || `${a.address.slice(0, 6)}…${a.address.slice(-4)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="destructive" size="sm" onClick={handleDisconnect}>
        Disconnect
      </Button>
    </div>
  );
}

function Domain({ domain, peers }: { domain: string; peers: Peer[] }) {
  return (
    <div className="flex items-center gap-1">
      <span> {peers[0].origin}</span>
      <div>
        <AffinityForm domain={domain} />
      </div>
    </div>
  );
}

function AffinityForm({ domain }: { domain: string }) {
  const [networks, currentGlobalNetwork] = useNetworks(
    useShallow((s) => [s.networks, s.current]),
  );
  const { data: affinity, refetch } = useInvoke<Affinity>(
    "connections_affinity_for",
    {
      domain,
    },
  );

  useEventListener({ event: "peers-updated", callback: refetch });

  const [current, setCurrent] = useState<Affinity>("global");
  const [currentNetwork, setCurrentNetwork] = useState<Network | undefined>(
    currentGlobalNetwork,
  );

  useEffect(() => {
    setCurrent(affinity || "global");
  }, [affinity]);

  useEffect(() => {
    if (current === "global" || current === "unset") {
      setCurrentNetwork(currentGlobalNetwork);
    } else {
      setCurrentNetwork(
        networks.find(
          (n) =>
            n.id.chain_id === current.sticky.chain_id &&
            n.id.dedup_id === current.sticky.dedup_id,
        ),
      );
    }
  }, [current, networks, currentGlobalNetwork]);

  const handleChange = (value: string) => {
    const selection = JSON.parse(value);

    let affinity: Affinity = "global";
    if (selection !== "global") {
      affinity = { sticky: selection };
    }
    invoke("connections_set_affinity", {
      domain,
      affinity,
    }).catch((err) => console.warn("Failed to update connection affinity", err));
    setCurrent(affinity);
  };

  const value = JSON.stringify(
    current === "global" || current === "unset" ? "global" : current.sticky,
  );
  const isGlobal = current === "global" || current === "unset";

  return (
    <Select defaultValue={JSON.parse(value)} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue>
          {!isGlobal && currentNetwork ? (
            <ChainView
              chainId={currentNetwork.id.chain_id}
              name={currentNetwork.name}
            />
          ) : (
            "Global"
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          <SelectItem value={JSON.stringify("global")}>Global</SelectItem>
          {networks.map((network) => (
            <SelectItem value={JSON.stringify(network.id)} key={network.name}>
              <ChainView chainId={network.id.chain_id} name={network.name} />
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
