import classnames from "classnames";
import { useContext } from "react";

import { useStore } from "@iron/state";

import { ExtensionContext } from "../../context";

export function QuickNetworkSelect() {
  const { stream } = useContext(ExtensionContext);
  const [networks, currentIdx, setCurrentNetwork] = useStore(
    ({ network, setCurrentNetwork }) => [
      network.networks,
      network.current,
      setCurrentNetwork,
    ]
  );

  const current = networks[currentIdx];

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    i: number
  ) => {
    e.preventDefault();
    if (currentIdx == i) return;
    setCurrentNetwork(i, stream);
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-primary m-1">
        {current.name}
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu p-2 shadow bg-base-100 text-black rounded-box w-52"
      >
        {networks.map(({ name }, i) => (
          <li key={i}>
            <a
              onClick={(e) => handleClick(e, i)}
              className={classnames({ "bg-slate-400": i === currentIdx })}
            >
              {name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
