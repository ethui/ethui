import {
  useMediaQuery,
  ButtonBase,
  type ButtonBaseProps,
  Stack,
  Collapse,
  Box,
  SvgIcon,
} from "@mui/material";
import { lightBlue } from "@mui/material/colors";
import { Link } from "wouter";

import { useTheme } from "@/store";

type Props = Omit<
  ButtonBaseProps<"a", { component: "a" }>,
  "component" | "sx" | "disabled"
> & {
  href: string;
  label: string;
  icon: typeof SvgIcon;
  selected: boolean;
};

export function SidebarButton({ href, selected, label, ...props }: Props) {
  const { theme } = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <ButtonBase
      disabled={selected}
      LinkComponent={Link}
      href={href}
      sx={{
        height: 32,
        justifyContent: "flex-start",
        [theme.breakpoints.up("sm")]: {
          borderRadius: 1,
          paddingLeft: "8px",
        },
        [theme.breakpoints.down("sm")]: {
          borderRadius: "50%",
          width: "35px",
          height: "35px",
          justifyContent: "center",
        },
        "&.Mui-disabled": {
          backgroundColor: lightBlue[800],
          color: "white",
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0}>
        <props.icon fontSize="small" />

        <Collapse
          orientation="horizontal"
          in={isLarge}
          collapsedSize={0}
          timeout={{ exit: 0 }}
        >
          <Box sx={{ pl: 1 }}>{label}</Box>
        </Collapse>
      </Stack>
    </ButtonBase>
  );
}
