import { Avatar } from "@mui/material";

export interface IconEffigyProps extends React.ComponentProps<typeof Avatar> {
  address: string;
  size?: number;
}

export function IconEffigy({ address, size = 24, ...props }: IconEffigyProps) {
  return (
    <Avatar
      sx={{ width: size, height: size }}
      src={`https://effigy.im/a/${address}.svg`}
      {...props}
    />
  );
}
