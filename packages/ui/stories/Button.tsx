import React from "react";

import { Button as UIButton } from "../components/ui/button";
import "./button.css";

/** Primary UI component for user interaction */
export const Button = () => {
  return (
    <>
      <UIButton>Click</UIButton>
      <UIButton variant="destructive">Click</UIButton>
    </>
  );
};
