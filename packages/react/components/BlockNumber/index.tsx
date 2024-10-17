import { Box as BoxIcon } from "lucide-react";
import { Typography } from "../Typography";

export interface BlockNumberProps {
  number?: number;
}

export const BlockNumber = ({ number }: BlockNumberProps) => (
  <div className="flex m-3 items-center">
    <BoxIcon size={14} />
    <Typography variant="caption" color="success">
      {number}
    </Typography>
  </div>
);
