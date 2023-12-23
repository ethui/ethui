import {
  useMediaQuery,
  ButtonBase,
  type ButtonBaseProps,
  Stack,
  Collapse,
  SvgIcon,
  Typography,
} from "@mui/material";
import { lightBlue } from "@mui/material/colors";
import { Link } from "react-router-dom";

import { useTheme } from "@/store";

type Props<RootType extends React.ElementType> = Omit<
  ButtonBaseProps<RootType>,
  "component" | "sx" | "disabled"
> & {
  label: string;
  icon: typeof SvgIcon;
  selected?: boolean;
};

export function SidebarButton<R extends React.ElementType>({
  label,
  selected,
  ...props
}: Props<R>) {
  const { theme } = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <ButtonBase
      disabled={selected}
      LinkComponent={Link}
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
