import { type Meta, type StoryObj } from "@storybook/react";
import Stack from "@mui/material/Stack";

import { Button, ButtonProps } from "./";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
};

export default meta;

const Template: StoryObj<typeof Button> = (args) => <Button {...args} />;

export const Playground = Template.bind({});
Playground.args = {
  label: "Click me!",
  variant: "contained",
};

type Story = StoryObj<ButtonProps>;

export const Variants: Story = {
  render: () => {
    return (
      <Stack spacing={2} maxWidth={300}>
        <Button variant="text" label="Text Button" />
        <Button variant="contained" label="Contained Button" />
        <Button variant="outlined" label="Outlined Button" />
      </Stack>
    );
  },
};

export const Colors: Story = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="contained" label="Primary" />
      <Button variant="contained" color="secondary" label="Secondary" />
      <Button variant="contained" color="success" label="Success" />
      <Button variant="contained" color="error" label="Error" />
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="contained" size="small" label="Small" />
      <Button variant="contained" size="medium" label="Medium" />
      <Button variant="contained" size="large" label="Large" />
    </Stack>
  ),
};
