import { Stack } from "@mui/material";
import { Box as BoxIcon } from "lucide-react";
import { Typography } from "../Typography";

export interface BlockNumberProps {
  number?: number;
}

export const BlockNumber = ({ number }: BlockNumberProps) => (
  <Stack direction="row" alignItems="center" spacing={0}>
    <BoxIcon size={14} />
    <span variant="caption" color="success">
      {number}
    </span>
  </Stack>
);
