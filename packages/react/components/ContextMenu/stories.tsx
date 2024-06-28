import type { Meta, StoryObj } from "@storybook/react";

import { ContextMenu, type ContextMenuProps } from "./";
import { defaultDisabledArgs } from "../../utils";

const meta: Meta<ContextMenuProps> = {
  title: "Components/ContextMenu",
  component: ContextMenu,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Chain: StoryObj<ContextMenuProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <ContextMenu
        copy="bar"
        actions={[
          { label: "Copy", action: () => navigator.clipboard.writeText("bar") },
        ]}
      >
        foo
      </ContextMenu>
    );
  },
};
