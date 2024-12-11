import { useRouterState } from "@tanstack/react-router";

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

  const breadcrumbs = matches.reduce(
    (acc, { context, pathname }) => {
      if (
        context?.breadcrumb &&
        context.breadcrumb !== acc[acc.length - 1]?.label
      ) {
        acc.push({ label: context.breadcrumb, path: pathname });
      }
      return acc;
    },
    [] as { label: string; path: string }[],
  );

  return (
    <Breadcrumb className="md:mx-4">
      <BreadcrumbList>
        {breadcrumbs.map(({ label, path }, i) => (
          <Fragment key={path}>
            {i > 0 && <BreadcrumbSeparator />}
            <Item key={path} label={label} path={path} />
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Item({ label, path }: { label: string; path: string }) {
  return (
    <BreadcrumbItem>
      <BreadcrumbLink asChild className="font-bold">
        <Link href={path}>{label}</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
