import type { Meta, StoryObj } from "@storybook/react";

import { ChainView, type ChainViewProps } from "./";
import { defaultDisabledArgs } from "../../utils";
import { Stack } from "@mui/material";

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
      <Stack spacing={2} direction="column">
        <ChainView chainId={1} name="Mainnet" />
        <ChainView chainId={10} name="Optimism" />
        <ChainView chainId={31337} name="Anvil" />
      </Stack>
    );
  },
};
