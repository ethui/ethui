import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Box,
  Container,
  IconButton,
  MobileStepper,
  Stack,
  Typography,
} from "@mui/material";

import { type Step, type WizardFormData } from "./";

interface Props {
  steps: Step[];
  activeStep: number;
  formData: WizardFormData;
  handleClose: () => unknown;
  handleNext: () => unknown;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
}

export function OnboardingCarousel({
  steps,
  activeStep,
  formData,
  handleNext,
  setFormData,
}: Props) {
  const maxSteps = steps.length;
  const step = steps[activeStep];

  return (
    <Container disableGutters maxWidth="sm" sx={{ mt: 8, mb: 10 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={{ xs: 3, sm: 8 }}
      >
        <Stack width="65%" alignItems="center">
          <Typography variant="h6" component="h1" mb={1.5} alignSelf="start">
            {steps[activeStep].title}
          </Typography>
          <Box height={{ xs: "260px", sm: "180px" }} alignSelf="start">
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
          disabled={activeStep === maxSteps - 1}
          sx={{
            visibility: activeStep === maxSteps - 1 ? "hidden" : "visible",
            border: "1px solid currentColor",
          }}
        >
          <KeyboardArrowRight />
        </IconButton>
      </Stack>
    </Container>
  );
}
