import classnames from "classnames";

import { useSettings } from "../../hooks/useSettings";

export function QuickNetworkSelect() {
  const settings = useSettings();

  // TODO:
  if (!settings.data) return <>Loading</>;

  const { networks, current: currentIdx } = settings.data.network;
  const current = networks[currentIdx];

  console.log("data", settings.data.network);
  console.log("networks", networks);
  console.log(current);
  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    i: number
  ) => {
    e.preventDefault();
    if (currentIdx == i) return;
    settings.methods.setCurrentNetwork(i);
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
