import { useDialog } from "@/hooks";

interface Request {
  name: string;
  file: string;
}

export function NetworkAddDialog({ id }: { id: number }) {
  const { data, send, listen } = useDialog<Request>(id);

  return <>new network</>;
}
