import { ExpandMore } from "@mui/icons-material";
import {
  type AccordionProps,
  type AccordionSummaryProps,
  Accordion as MuiAccordion,
  AccordionSummary as MuiAccordionSummary,
} from "@mui/material";

export { AccordionDetails } from "@mui/material";

export function Accordion(
  props: Omit<AccordionProps, "disableGutters" | "TransitionProps">,
) {
  return (
    <MuiAccordion
      disableGutters
      slotProps={{ transition: { unmountOnExit: true } }}
      {...props}
    />
  );
}

export function AccordionSummary(
  props: Omit<AccordionSummaryProps, "expandIcon">,
) {
  return <MuiAccordionSummary expandIcon={<ExpandMore />} {...props} />;
}
