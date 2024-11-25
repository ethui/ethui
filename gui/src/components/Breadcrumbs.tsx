import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ethui/ui/components/shadcn/breadcrumb";

export function Breadcrumbs() {
  //const matches = useMatches();

  //const breadcrumbs = matches.reduce((acc, match) => {
  //  if (match.staticData?.breadcrumb) {
  //    acc.push(match.staticData.breadcrumb);
  //  }
  //  return acc;
  //}, []);

  //console.log("b", breadcrumbs);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/components">Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
