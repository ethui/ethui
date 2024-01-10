import { useWallets } from "@/store";
import { AddressView, BalancesList } from "./";
import { Navbar } from "./Home/Navbar";

export function Account() {
  const address = useWallets((s) => s.address);

  if (!address) return null;

  return (
    <>
      <Navbar>
        <AddressView variant="h6" address={address} />
      </Navbar>
      <BalancesList />
    </>
  );
}
