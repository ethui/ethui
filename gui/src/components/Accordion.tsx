import { ExpandMore } from "@mui/icons-material";
import {
  Accordion as MuiAccordion,
  AccordionSummary as MuiAccordionSummary,
  type AccordionProps,
  type AccordionSummaryProps,
} from "@mui/material";

export { AccordionDetails } from "@mui/material";

export function Accordion(
  props: Omit<AccordionProps, "disableGutters" | "TransitionProps">,
) {
  return (
    <MuiAccordion
      disableGutters
      TransitionProps={{ unmountOnExit: true }}
      {...props}
    />
  );
}

export function AccordionSummary(
  props: Omit<AccordionSummaryProps, "expandIcon">,
) {
  return <MuiAccordionSummary expandIcon={<ExpandMore />} {...props} />;
}
