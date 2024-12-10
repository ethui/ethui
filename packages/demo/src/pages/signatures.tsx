import { SignString, SignTypedData } from "@/components/signatures/";
import { Divider, Stack } from "@mui/material";

export default function Signatures() {
  return (
    <Stack direction="column">
      <SignString />
      <Divider sx={{ my: 10 }} />
      <SignTypedData />
    </Stack>
  );
}
