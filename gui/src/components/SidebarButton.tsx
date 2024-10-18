import {
  ButtonBase,
  type ButtonBaseProps,
  Collapse,
  type SvgIcon,
  useMediaQuery,
} from "@mui/material";
import { lightBlue } from "@mui/material/colors";
import { Link, useMatchRoute } from "@tanstack/react-router";

import { useTheme } from "#/store/useTheme";

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
      <div className=" m-3 flex items-center justify-stretch">
        <props.icon fontSize="small" />

        <Collapse
          orientation="horizontal"
          in={isLarge}
          collapsedSize={0}
          timeout={{ exit: 0 }}
          sx={{ flexGrow: 1 }}
        >
          <span sx={{ pl: 1, display: "inline", whiteSpace: "nowrap" }}>
            {label}
          </span>
        </Collapse>
      </div>
    </ButtonBase>
  );
}
