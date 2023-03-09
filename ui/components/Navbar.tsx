import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { Link } from "wouter";

import { QuickAccountSelect } from "./Settings/QuickAccountSelect";
import { QuickNetworkSelect } from "./Settings/index";

export function Navbar() {
  return (
    <div className="navbar bg-neutral text-neutral-content rounded-box">
      <div className="flex-1">
        <Link href="/">
          <a className="btn btn-ghost normal-case text-xl">Iron Wallet</a>
        </Link>
      </div>
      <div className="flex-none">
        <QuickAccountSelect />
        <QuickNetworkSelect />
        <Link href="/settings">
          <button className="btn btn-square btn-ghost">
            {" "}
            <Cog6ToothIcon className="h-6 w-6 text-white" />
          </button>
        </Link>
      </div>
    </div>
  );
}
