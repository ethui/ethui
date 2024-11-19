import { createFileRoute } from '@tanstack/react-router'

import { AddressView } from '#/components/AddressView'
import { AppNavbar } from '#/components/AppNavbar'
import { BalancesList } from '#/components/BalancesList'
import { useWallets } from '#/store/useWallets'

export const Route = createFileRoute('/home/_l/account')({
  component: Account,
})

function Account() {
  const address = useWallets((s) => s.address)

  if (!address) return null

  return (
    <>
      <AppNavbar title={<AddressView address={address} />} />
      <div className="container">
        <BalancesList />
      </div>
    </>
  )
}
