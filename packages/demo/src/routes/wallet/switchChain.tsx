import { config } from '#/components/ethereum'
import { Button } from '@ethui/ui/components/shadcn/button'
import { createFileRoute } from '@tanstack/react-router'
import { switchChain } from '@wagmi/core'
import { useChainId, useChains } from 'wagmi'

export const Route = createFileRoute('/wallet/switchChain')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col gap-14">
      <CurrentChain />
      <SwitchChain />
    </div>
  )
}

function CurrentChain() {
  const chainId = useChainId()

  return (
    <div className="flex gap-2">
      <div>Current Chain:</div>
      <strong>{chainId}</strong>
    </div>
  )
}

function SwitchChain() {
  const chains = useChains()

  return (
    <div>
      <h2 className="pb-2 font-bold text-xl">wallet_switchEthereumChain</h2>
      <div className="flex gap-2">
        {chains.map((c) => (
          <Button
            key={c.id}
            onClick={() => switchChain(config, { chainId: c.id })}
          >
            {c.name} ({c.id})
          </Button>
        ))}
      </div>
    </div>
  )
}
