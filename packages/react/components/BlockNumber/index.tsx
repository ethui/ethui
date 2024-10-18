import { Box as BoxIcon } from "lucide-react";

export interface BlockNumberProps {
  number?: number;
}

export const BlockNumber = ({ number }: BlockNumberProps) => (
  <div className="flex flex-ro items-center">
    <BoxIcon size={14} />
    {number}
  </div>
);
