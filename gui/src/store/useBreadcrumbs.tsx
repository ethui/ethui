import { createContext, useContext, useState } from "react";

const BreadcrumbsContext = createContext({});

type BreadcrumbItem = string;

interface Props {
  children: React.ReactNode;
}

export const BreadcrumbsProvider = ({ children }: Props) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  const appendBreadcrumb = (item: BreadcrumbItem) => {
    setBreadcrumbs((prev) => [...prev, item]);
  };

  return (
    <BreadcrumbsContext.Provider value={{ breadcrumbs, appendBreadcrumb }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
};

export const useBreadcrumbs = () => useContext(BreadcrumbsContext);
