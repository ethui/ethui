import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { Container, IconButton, Stack } from "@mui/material";
import Box from "@mui/material/Box";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { Step } from "./OnboardingSteps";

interface Props {
  steps: Step[];
  activeStep: number;
  handleClose: () => void;
  handleNext: () => void;
  handleBack: () => void;
}

export function OnboardingCarousel({
  steps,
  activeStep,
  handleNext,
  handleBack,
}: Props) {
  const theme = useTheme();
  const maxSteps = steps.length;

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
          <Box height={{ xs: "260px", sm: "180px" }} alignSelf="start">
            {steps[activeStep].component}
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
