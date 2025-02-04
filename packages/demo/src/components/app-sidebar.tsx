import { EthuiLogo } from "@ethui/ui/components/ethui-logo";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ethui/ui/components/shadcn/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ethui/ui/components/shadcn/sidebar";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Contracts",
      url: "#",
      items: [
        {
          title: "ERC20 (Token)",
          to: "/contracts/erc20",
        },
        {
          title: "ERC721 (NFT)",
          to: "/contracts/erc721",
        },
      ],
    },
    {
      title: "Signatures",
      url: "#",
      items: [
        {
          title: "Basic",
          to: "/signatures/basic",
        },
        {
          title: "EIP-712",
          to: "/signatures/eip712",
        },
      ],
    },
    {
      title: "wallet_*",
      url: "#",
      items: [
        { title: "switchChain", to: "/wallet/switchChain" },
        {
          title: "addEthereumChain",
          to: "/wallet/addEthereumChain",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex flex-row items-center justify-center">
        <EthuiLogo fg="fill-dev" bg="bg-transparent" />
        <span>ethui demo</span>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {data.navMain.map((item) => (
          <Collapsible
            key={item.title}
            title={item.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className="group/label text-sidebar-foreground text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <CollapsibleTrigger>
                  {item.title}{" "}
                  <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map(({ title, to }) => (
                      <SidebarMenuItem key={to}>
                        <SidebarMenuButton asChild>
                          <Link to={to}>{title}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
