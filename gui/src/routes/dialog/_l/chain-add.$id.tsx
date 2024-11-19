import { createFileRoute } from '@tanstack/react-router'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { isDirty, isValid } from 'zod'

import type { Network } from '@ethui/types/network'
import { ChainView } from '@ethui/ui/components/chain-view'
import { Button } from '@ethui/ui/components/shadcn/button'
import { Datapoint } from '#/components/Datapoint'
import { useDialog } from '#/hooks/useDialog'

export const Route = createFileRoute('/dialog/_l/chain-add/$id')({
  component: ChainAddDialog,
})

function ChainAddDialog() {
  const { id } = Route.useParams()
  const { data: network, send } = useDialog<Network>(id)

  if (!network) return null

  return (
    <div className="m-1 flex flex-col items-center">
      <h1 className="font-xl">Add new network?</h1>

      <ChainView chainId={network.chain_id} name={network.name} />

      <div className="grid grid-cols-4 gap-5">
        <Datapoint label="Chain ID" value={network.chain_id} />
        <Datapoint label="Currency" value={network.currency} />
        <Datapoint label="Decimals" value={network.decimals} />
        <Datapoint label="Decimals" value={network.decimals} />
        <Datapoint
          className="col-span-4"
          label="RPC (HTTP)"
          value={network.http_url}
        />
        {network.ws_url && (
          <Datapoint
            className="col-span-4"
            label="RPC (WS)"
            value={network.ws_url}
          />
        )}
        {network.explorer_url && (
          <Datapoint
            className="col-span-4"
            label="Explorer"
            value={network.explorer_url}
          />
        )}
      </div>

      <div className=" m-1 flex">
        <Button
          variant="destructive"
          onClick={() => getCurrentWebviewWindow().close()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || !isValid}
          onClick={() => send('accept')}
        >
          Add
        </Button>
      </div>
    </div>
  )
}
