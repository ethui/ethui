import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { useState } from "react";
import type { OrganizedContract, ProjectGroup } from "#/store/useContracts";
import { formatProjectPath } from "#/utils";

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
    groups.map((g) => g.projectPath || g.projectName),
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
      {groups.map((group) => {
        const isEmpty = group.contracts.length === 0;
        const groupKey = group.projectPath || group.projectName;

        return (
          <AccordionItem key={groupKey} value={groupKey} disabled={isEmpty}>
            <AccordionTrigger
              className={`h-auto w-full justify-start px-4 py-3 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isEmpty
                  ? 'cursor-default opacity-50 pointer-events-none'
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium text-base">
                  {formatProjectPath(group.projectName, group.gitRoot).map(
                    (part, i) => (
                      <span
                        key={i}
                        className={
                          part.type === "gitRepo"
                            ? "font-bold text-primary"
                            : part.type === "suffix"
                              ? "text-muted-foreground"
                              : ""
                        }
                      >
                        {part.text}
                      </span>
                    )
                  )}{" "}
                  <span className="font-normal text-muted-foreground">
                    [{group.contracts.length}]
                  </span>
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 py-0">
              {group.contracts.map((contract) => renderContract(contract))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
