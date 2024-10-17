import type { Meta, StoryObj } from "@storybook/react";

import { defaultDisabledArgs } from "../../utils";
import { ClickToCopy, type ClickToCopyProps } from "./";

const meta: Meta<ClickToCopyProps> = {
  title: "Components/ClickToCopy",
  component: ClickToCopy,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Chain: StoryObj<ClickToCopyProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <ClickToCopy text="bar" write={console.log}>
        foo
      </ClickToCopy>
    );
  },
};
