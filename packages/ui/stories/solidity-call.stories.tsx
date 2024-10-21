import type { Meta, StoryObj } from "@storybook/react";

import React from "react";
import { SolidityCall } from "../components/solidity-call";

const meta: Meta<typeof SolidityCall> = {
  title: "ethui/SolidityCall",
  component: SolidityCall,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    from: { control: "text" },
    to: { control: "text" },
    chainId: { control: "number" },
    decimals: { control: "number" },
    data: { control: "text" },
    value: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EthTransfer: Story = {
  args: {
    from: "0xalice",
    to: "0x6aD2...4E45",
    value: BigInt(1e18).toString(),
    chainId: 1,
    decimals: 18,
  },
};

export const ERC20Transfer: Story = {
  args: {
    from: "0x6aD2...4E45",
    to: "0x6aD2...4E45",
    data: "0xa9059cbb0000000000000000000000006ad20adf8ab9db9b3b3f47987b3d87bfc4674e450000000000000000000000000000000000000000000000000000000773594000",
    chainId: 1,
    decimals: 18,
    abi: ["function transfer(address from, uint256 amount)"],
  },
};

export const ERC20TransferWithCustomRenderer: Story = {
  render: () => {
    return (
      <SolidityCall
        from="0xalice"
        to="0x6aD20ADF8ab9DB9B3B3F47987B3d87bFc4674E45"
        data="0xa9059cbb0000000000000000000000006ad20adf8ab9db9b3b3f47987b3d87bfc4674e450000000000000000000000000000000000000000000000000000000773594000"
        value={0n}
        chainId={1}
        decimals={18}
        abi={["function transfer(address from, uint256 amount)"]}
        ArgProps={{
          addressRenderer: () => <span className="font-mono">alias</span>,
        }}
      />
    );
  },
};

export const UnknownCall: Story = {
  render: () => {
    return (
      <SolidityCall
        from="0xalice"
        to="0x6aD2...4E45"
        data="0xa9059cbb0000000000000000000000006ad20adf8ab9db9b3b3f47987b3d87bfc4674e450000000000000000000000000000000000000000000000000000000773594000"
        value={0n}
        chainId={1}
        decimals={18}
      />
    );
  },
};
