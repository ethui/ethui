import { LayoutGrid, type LucideIcon } from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/home/account",
          label: "Account",
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/home/transactions",
          label: "Transactions",
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/home/contracts",
          label: "Contracts",
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/home/connections",
          label: "Connections",
          icon: LayoutGrid,
          submenus: [],
        },
      ],
    },
  ];
}
