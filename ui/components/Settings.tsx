import React, { useState } from "react";
import { NetworkSettings, WalletSettings } from "./Settings/index";
import classnames from "classnames";

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
        <ul className="menu bg-base-100">
          {sections.map(({ name }, index) => (
            <li key={index}>
              <a
                onClick={() => setSectionIdx(index)}
                className={classnames({ active: sectionIdx === index })}
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-3/4 p-4">
        <h2 className="text-xl">
          Settings {">"} {currentSection.name}
        </h2>
        <currentSection.component />
      </div>
    </div>
  );
}
