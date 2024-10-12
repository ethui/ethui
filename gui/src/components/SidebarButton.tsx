import {
  useMediaQuery,
  ButtonBase,
  type ButtonBaseProps,
  Stack,
  Collapse,
  type SvgIcon,
  Typography,
} from "@mui/material";
import { lightBlue } from "@mui/material/colors";
import { Link, useMatchRoute } from "@tanstack/react-router";

import { useTheme } from "@/store";

type Props<RootType extends React.ElementType> = Omit<
  ButtonBaseProps<RootType>,
  "component" | "sx" | "disabled"
> & {
  label: string;
  icon: typeof SvgIcon;
};

export function SidebarButton<R extends React.ElementType>({
  label,
  ...props
}: Props<R>) {
  const matchRoute = useMatchRoute();
  const params = props.to && matchRoute({ to: props.to });
  const { theme } = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <ButtonBase
      LinkComponent={Link}
      disabled={!!params}
      {...props}
      sx={{
        height: 32,
        justifyContent: "flex-start",
        transition: theme.transitions.create("border-radius"),
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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="stretch"
        spacing={0}
      >
        <props.icon fontSize="small" />

        <Collapse
          orientation="horizontal"
          in={isLarge}
          collapsedSize={0}
          timeout={{ exit: 0 }}
          sx={{ flexGrow: 1 }}
        >
          <Typography sx={{ pl: 1, display: "inline", whiteSpace: "nowrap" }}>
            {label}
          </Typography>
        </Collapse>
      </Stack>
    </ButtonBase>
  );
}
