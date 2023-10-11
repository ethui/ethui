import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import {
  Box,
  Container,
  IconButton,
  MobileStepper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

import { type Step, type WizardFormData } from "./";

interface Props {
  steps: Step[];
  activeStep: number;
  formData: WizardFormData;
  handleClose: () => unknown;
  handleNext: () => unknown;
  handleBack: () => unknown;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
}

export function OnboardingCarousel({
  steps,
  activeStep,
  formData,
  handleNext,
  handleBack,
  setFormData,
}: Props) {
  const theme = useTheme();
  const maxSteps = steps.length;
  const step = steps[activeStep];

  const disableNext =
    activeStep == 3 && !(formData.createTestWallet || formData.addedHDWallet);

  return (
    <Container disableGutters maxWidth="sm" sx={{ mt: 8, mb: 10 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={{ xs: 3, sm: 8 }}
      >
        <IconButton
          size="medium"
          onClick={handleBack}
          disabled={activeStep === 0}
          sx={{
            visibility: activeStep === 0 ? "hidden" : "visible",
            border: "1px solid currentColor",
          }}
        >
          {theme.direction === "rtl" ? (
            <KeyboardArrowRight />
          ) : (
            <KeyboardArrowLeft />
          )}
        </IconButton>
        <Stack width="100%" alignItems="center">
          <Typography variant="h6" component="h1" mb={1.5} alignSelf="start">
            {steps[activeStep].title}
          </Typography>
          <Box
            minHeight={{ xs: "260px", sm: "180px" }}
            width="100%"
            pb={2.5}
            alignSelf="start"
          >
            <step.component setFormData={setFormData} formData={formData} />
          </Box>
          <MobileStepper
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            nextButton={<></>}
            backButton={<></>}
          />
        </Stack>
        <IconButton
          color="inherit"
          size="medium"
          onClick={handleNext}
          disabled={activeStep === maxSteps - 1 || disableNext}
          sx={{
            visibility: activeStep === maxSteps - 1 ? "hidden" : "visible",
            border: "1px solid currentColor",
          }}
        >
          {theme.direction === "rtl" ? (
            <KeyboardArrowLeft />
          ) : (
            <KeyboardArrowRight />
          )}
        </IconButton>
      </Stack>
    </Container>
  );
}
