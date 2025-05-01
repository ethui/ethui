import { useLocation, useRouterState } from "@tanstack/react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@ethui/ui/components/shadcn/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";

export function Breadcrumbs() {
  const matches = useRouterState({ select: (s) => s.matches });
  const { pathname: current } = useLocation();

  const breadcrumbs = matches.reduce(
    (acc, { context, pathname }) => {
      if (!context?.breadcrumb) return acc;

      if (typeof context.breadcrumb === "string") {
        if (context.breadcrumb === acc[acc.length - 1]?.label) return acc;
        acc.push({ label: context.breadcrumb, path: pathname });
      } else {
        if (context.breadcrumb.label === acc[acc.length - 1]?.label) return acc;
        acc.push(context.breadcrumb);
      }
      return acc;
    },
    [] as { label: string; path: string }[],
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map(({ label, path }, i) => (
          <Fragment key={path + i}>
            {i > 0 && <BreadcrumbSeparator />}
            <Item key={path} label={label} path={path} current={current} />
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

interface BreadcrumbItemProps {
  label: string;
  path: string;
  current: string;
}

function Item({ label, path, current }: BreadcrumbItemProps) {
  return (
    <BreadcrumbItem className="font-bold">
      {!path || current === path ? (
        <span className="text-foreground">{label}</span>
      ) : (
        <BreadcrumbLink asChild className="font-bold">
          <Link to={path}>{label}</Link>
        </BreadcrumbLink>
      )}
    </BreadcrumbItem>
  );
}
