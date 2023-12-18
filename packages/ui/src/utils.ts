const defaultDisabledArgsList = [
  "disableElevation",
  "tabIndex",
  "ref",
  "style",
  "onFocusVisible",
  "LinkComponent",
  "focusVisibleClassName",
  "component",
  "className",
  "action",
  "fullWidth",
  "endIcon",
  "startIcon",
  "disableFocusRipple",
  "disableTouchRipple",
  "focusRipple",
  "disableRipple",
  "centerRipple",
  "TouchRippleProps",
  "touchRippleRef",
  "children",
  "classes",
];

export function disabledArgs(args: string[]) {
  return args.reduce(
    (a, v) => ({
      ...a,
      [v]: { table: { disable: true } },
    }),
    {},
  );
}

export function defaultDisabledArgs() {
  return defaultDisabledArgsList.reduce(
    (a, v) => ({
      ...a,
      [v]: { table: { disable: true } },
    }),
    {},
  );
}
