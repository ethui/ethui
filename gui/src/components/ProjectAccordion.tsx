import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { useState } from "react";
import type { OrganizedContract, ProjectGroup } from "#/store/useContracts";

interface ProjectAccordionProps {
  groups: ProjectGroup[];
  renderContract: (contract: OrganizedContract) => React.ReactNode;
  // Optional controlled state props
  expandedItems?: string[];
  onExpandedChange?: (items: string[]) => void;
}

export function ProjectAccordion({
  groups,
  renderContract,
  expandedItems: controlledExpandedItems,
  onExpandedChange,
}: ProjectAccordionProps) {
  // Internal state used only when not controlled externally
  const [internalExpandedItems, setInternalExpandedItems] = useState<string[]>(
    groups.map((g) => g.projectName),
  );

  // Use controlled state if provided, otherwise use internal
  const expandedItems = controlledExpandedItems ?? internalExpandedItems;
  const setExpandedItems = onExpandedChange ?? setInternalExpandedItems;

  return (
    <Accordion
      type="multiple"
      value={expandedItems}
      onValueChange={setExpandedItems}
    >
      {groups.map((group) => (
        <AccordionItem key={group.projectName} value={group.projectName}>
          <AccordionTrigger className="h-auto w-full cursor-pointer justify-start px-2 py-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-medium text-base">
                  {group.projectName} ({group.contracts.length})
                </span>
                {group.projectPath && (
                  <span className="text-muted-foreground text-sm">
                    {group.projectPath}
                  </span>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 py-0">
            {group.contracts.map((contract) => renderContract(contract))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
