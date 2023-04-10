import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import classnames from "classnames";
import { Fragment } from "react";

interface Props<T extends string | number = string> {
  label: string;
  entries: Record<T, string>;
  onChange?: (key: T) => void;
}

export default function Dropdown({ label, entries, onChange }: Props) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          {label}
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 min-w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {Object.entries(entries).map(([k, v]) => (
              <Menu.Item key={k}>
                {({ active }) => (
                  <a
                    href="#"
                    className={classnames({
                      "block px-4 py-2 text-sm": true,
                      "bg-gray-100 text-gray-900": active,
                      "text-gray-700": !active,
                    })}
                    onClick={() => onChange?.(k)}
                  >
                    {v}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

Dropdown.Item = Menu.Item;
