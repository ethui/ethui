import { Disclosure } from "@headlessui/react";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import React from "react";
import { Link } from "wouter";

import { QuickAccountSelect, QuickNetworkSelect } from "./Settings/index";

export function Navbar() {
  return (
    <Disclosure as="nav">
      <div className="mx-auto max-w-7xl px-2 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <a href="#">Iron Wallet</a>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0 flex gap-x-2 items-center">
              <QuickAccountSelect />
              <QuickNetworkSelect />
              <Link href="/settings">
                <a>
                  <Cog6ToothIcon className="h-6 w-6" />
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Disclosure>
  );
}
