import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { Navbar as FlowbiteNavbar } from "flowbite-react";
import { Link } from "wouter";

import { QuickAccountSelect } from "./Settings/QuickAccountSelect";
import { QuickNetworkSelect } from "./Settings/index";

const { Brand, Toggle, Collapse } = FlowbiteNavbar;

export function Navbar() {
  return (
    <FlowbiteNavbar>
      <Brand>
        <Link href="/">
          <a>Iron Wallet</a>
        </Link>
      </Brand>
      <Toggle />
      <Collapse>
        <QuickAccountSelect />
        <QuickNetworkSelect />
        <Link href="/settings">
          <a>
            <Cog6ToothIcon className="h-6 w-6" />
          </a>
        </Link>
      </Collapse>
    </FlowbiteNavbar>
  );
}
