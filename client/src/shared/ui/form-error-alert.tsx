import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/shared/ui/alert";

export function FormErrorAlert({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
