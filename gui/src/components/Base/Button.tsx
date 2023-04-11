import classnames from "classnames";

interface Props {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  children: React.ReactNode;
  color: "default" | "warning" | "success";
  size: "default" | "xs";
  onClick?: () => void;
}

const colors = {
  default: "bg-indigo-600 hover:bg-indigo-500",
  success: "bg-green-600 hover:bg-green-500",
  warning: "bg-amber-600 hover:bg-amber-500",
};

const sizes = {
  default: "px-3.5 py-2.5 text-sm",
  xs: "px-2.5 py-1.5 text-xs",
};

export default function Example({
  type,
  disabled,
  children,
  color,
  size,
  onClick,
}: Props) {
  return (
    <button
      {...{ type, disabled, onClick }}
      className={classnames(colors[color], sizes[size], {
        "rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600":
          true,
        "bg-indigo-400 cursor-not-allowed": disabled,
      })}
    >
      {children}
    </button>
  );
}

Example.defaultProps = {
  color: "default",
  size: "default",
};
