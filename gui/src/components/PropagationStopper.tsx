type PropagationStopperProps = React.HTMLAttributes<HTMLDivElement>;

export function PropagationStopper({
  children,
  onClick,
  ...props
}: PropagationStopperProps) {
  return (
    <div
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
    >
      {children}
    </div>
  );
}
