import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Container, MobileStepper, Stack } from "@mui/material";
import { PopoverContentProps } from "@reactour/tour";

export default function ContentComponent(props: PopoverContentProps) {
  const isFirstStep = props.currentStep === 0;
  const isLastStep = props.currentStep === props.steps.length - 1;
  const content = props.steps[props.currentStep].content;

  return (
    <Container disableGutters>
      <Stack
        direction="column"
        justifyContent="space-between"
        alignItems="stretch"
      >
        <Button sx={{ alignSelf: "end" }}>
          <CloseIcon />
        </Button>

        <Container sx={{ minHeight: 85 }}>{content as string}</Container>

        <MobileStepper
          steps={props.steps.length}
          position="static"
          activeStep={props.currentStep}
          backButton={
            <Button
              onClick={() => props.setCurrentStep((s) => s - 1)}
              disabled={isFirstStep}
            >
              <KeyboardArrowLeft />
            </Button>
          }
          nextButton={
            <Button
              onClick={() => props.setCurrentStep((s) => s + 1)}
              disabled={isLastStep}
            >
              <KeyboardArrowRight />
            </Button>
          }
        />
      </Stack>
    </Container>
  );
}
