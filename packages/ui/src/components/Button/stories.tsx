import { type Meta, type StoryObj } from "@storybook/react";
import Stack from "@mui/material/Stack";

import { Button, ButtonProps } from "./";

const meta: Meta<ButtonProps> = {
  title: "Components/Button",
  component: Button,
};

export default meta;

const Template: StoryObj<typeof Button> = {
  render: (args) => <Button {...args} />,
};

export const Playground = Template.bind({});
Playground.args = {
  label: "Click me!",
};

export const Variants: StoryObj<typeof Button> = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="text" label="Text Button" />
      <Button variant="contained" label="Contained Button" />
      <Button variant="outlined" label="Outlined Button" />
    </Stack>
  ),
};

export const Colors: StoryObj<typeof Button> = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="contained" label="Primary" />
      <Button variant="contained" color="secondary" label="Secondary" />
      <Button variant="contained" color="success" label="Success" />
      <Button variant="contained" color="error" label="Error" />
    </Stack>
  ),
};

export const Sizes: StoryObj<typeof Button> = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="contained" size="small" label="Small" />
      <Button variant="contained" size="medium" label="Medium" />
      <Button variant="contained" size="large" label="Large" />
    </Stack>
  ),
};
