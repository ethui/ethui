import classnames from "classnames";
import { useState } from "react";

import { NetworkSettings, WalletSettings } from "./Settings/index";

const sections = [
  { name: "Wallet", component: WalletSettings },
  { name: "Network", component: NetworkSettings },
];

export function Settings() {
  const [currentTab, setCurrentTab] = useState(sections[0]);

  return (
    <>
      <div>
        <div className="px-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {sections.map((tab) => (
              <a
                key={tab.name}
                onClick={() => setCurrentTab(tab)}
                className={classnames(
                  "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium cursor-pointer",

                  {
                    "border-indigo-500 text-indigo-600":
                      currentTab.name == tab.name,
                    "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700":
                      currentTab.name !== tab.name,
                  }
                )}
                aria-current={currentTab.name == tab.name ? "page" : undefined}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>
      </div>
      <div className="m-4">
        <currentTab.component />
      </div>
    </>
  );
}
