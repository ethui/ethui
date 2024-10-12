import { Avatar } from "@mui/material";

export interface IconTokenProps extends React.ComponentProps<typeof Avatar> {
  iconUrl: string;
  size?: "small" | "medium" | "large";
}

export function IconToken({
  iconUrl,
  size = "medium",
  ...props
}: IconTokenProps) {
  let width = 30;
  if (size === "small") width = 16;
  if (size === "large") width = 40;

  const finalIconUrl = iconUrl || "/cryptocurrency-icons/generic.svg";

  return <Avatar sx={{ width, height: width }} src={finalIconUrl} {...props} />;
}
