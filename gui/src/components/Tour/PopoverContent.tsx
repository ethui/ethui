import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Container,
  MobileStepper,
  Stack,
  Typography,
} from "@mui/material";
import { PopoverContentProps } from "@reactour/tour";

export default function PopoverContent(props: PopoverContentProps) {
  const { steps, currentStep, setCurrentStep, setIsOpen, onClickClose } = props;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const content = steps[currentStep].content as string;

  return (
    <Container disableGutters>
      <Stack
        direction="column"
        justifyContent="space-between"
        alignItems="stretch"
      >
        <Button
          sx={{ alignSelf: "end" }}
          onClick={() => {
            if (isLastStep) {
              onClickClose();
              setIsOpen(false);
            } else {
              setCurrentStep((s) => s + 1);
            }
          }}
        >
          <CloseIcon />
        </Button>

        <Container>
          <Typography>{content}</Typography>
        </Container>

        <MobileStepper
          steps={steps.length}
          position="static"
          activeStep={currentStep}
          backButton={
            <Button
              disabled={isFirstStep}
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              <KeyboardArrowLeft />
            </Button>
          }
          nextButton={
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
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
