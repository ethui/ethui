import { Sidebar } from "flowbite-react";
import { useState } from "react";

import { NetworkSettings, WalletSettings } from "./Settings/index";

const sections = [
  { name: "Wallet", component: WalletSettings },
  { name: "Network", component: NetworkSettings },
];

export function Settings() {
  const [sectionIdx, setSectionIdx] = useState(0);

  const currentSection = sections[sectionIdx];

  return (
    <div className="flex">
      <div className="w-1/4">
        <Sidebar>
          <Sidebar.Items>
            <Sidebar.ItemGroup>
              {sections.map(({ name }, index) => (
                <Sidebar.Item
                  key={index}
                  onClick={() => setSectionIdx(index)}
                  className="cursor-pointer"
                  active={index == sectionIdx}
                >
                  {name}
                </Sidebar.Item>
              ))}
            </Sidebar.ItemGroup>
          </Sidebar.Items>
        </Sidebar>
      </div>
      <div className="w-3/4 px-4">
        <div className="mt-4">
          <currentSection.component />
        </div>
      </div>
    </div>
  );
}
