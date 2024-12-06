import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";
import "../tailwind.css";
import React from "react";
import { ClipboardProvider } from "../components/providers/clipboard-provider";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  decorators: [
    withThemeByClassName({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    (Story) => (
      <div className="dark:bg-gray-800">
        <ClipboardProvider>
          <Story />
        </ClipboardProvider>
      </div>
    ),
  ],
};

export default preview;
