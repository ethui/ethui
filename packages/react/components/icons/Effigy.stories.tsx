import type { Meta, StoryObj } from "@storybook/react";

import {} from "@mui/material";
import { defaultDisabledArgs } from "../../utils";
import { IconEffigy, type IconEffigyProps } from "./Effigy";

const meta: Meta<IconEffigyProps> = {
  title: "Icons/IconEffigy",
  component: IconEffigy,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Effigy: StoryObj<IconEffigyProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <div className="m-1 flex">
        <IconEffigy address="vitalik.eth" />
        <IconEffigy address="brantly.eth" />
        <IconEffigy address="huh.eth" />
        <IconEffigy address="galligan.eth" />
        <IconEffigy address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" />
      </div>
    );
  },
};
