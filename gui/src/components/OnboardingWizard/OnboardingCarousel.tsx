import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { Button, Container, IconButton, Stack } from "@mui/material";
import Box from "@mui/material/Box";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { Logo } from "../Logo";
import { Step } from "./OnboardingWizard";

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
  handleClose,
  handleNext,
  handleBack,
}: Props) {
  const theme = useTheme();
  const maxSteps = steps.length;

  return (
    <Box px={3}>
      <Stack direction="row" py={1.5} spacing={1} alignItems="center">
        <Logo width={40} />
        <Typography>Iron Wallet</Typography>
      </Stack>
      <Container disableGutters maxWidth="sm" sx={{ mt: 8, mb: 10 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={8}
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
              {steps[activeStep].label}
            </Typography>
            <Box height="180px" alignSelf="start">
              {steps[activeStep].description}
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
      <Box textAlign="center">
        <Button
          variant="outlined"
          color="inherit"
          size="medium"
          onClick={handleClose}
        >
          {activeStep === maxSteps - 1 ? "Close" : "Skip"}
        </Button>
      </Box>
    </Box>
  );
}
