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

  const previousStep = () => setCurrentStep((s) => s - 1);

  const nextStep = () => setCurrentStep((s) => s + 1);

  const onClickCloseButton = () => {
    if (isLastStep && onClickClose) {
      onClickClose({ setIsOpen, setCurrentStep, currentStep });
      setIsOpen(false);
    } else {
      nextStep();
    }
  };

  return (
    <Container disableGutters>
      <Stack
        direction="column"
        justifyContent="space-between"
        alignItems="stretch"
      >
        <Button
          sx={{ alignSelf: "end" }}
          disabled={!isLastStep}
          onClick={onClickCloseButton}
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
            <Button disabled={isFirstStep} onClick={previousStep}>
              <KeyboardArrowLeft />
            </Button>
          }
          nextButton={
            <Button disabled={isLastStep} onClick={nextStep}>
              <KeyboardArrowRight />
            </Button>
          }
        />
      </Stack>
    </Container>
  );
}
