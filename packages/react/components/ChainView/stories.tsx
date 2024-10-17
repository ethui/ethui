import type { Meta, StoryObj } from "@storybook/react";

import { defaultDisabledArgs } from "../../utils";
import { ChainView, type ChainViewProps } from "./";

const meta: Meta<ChainViewProps> = {
  title: "Components/ChainView",
  component: ChainView,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Chain: StoryObj<ChainViewProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <div className="m-1 flex flex-col">
        <ChainView chainId={1} name="Mainnet" />
        <ChainView chainId={10} name="Optimism" />
        <ChainView chainId={31337} name="Anvil" />
      </div>
    );
  },
};
