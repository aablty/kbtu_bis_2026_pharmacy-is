import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Prescription, prescriptionEndpoints } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AppShell } from "@/widgets/layout";
import {
  type PrescriptionFileError,
  prescriptionFileError,
} from "../model/validate-file";

const STATUS_ICON = {
  pending: ClockIcon,
  approved: CheckCircle2Icon,
  rejected: XCircleIcon,
} as const;

export function PrescriptionsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<PrescriptionFileError | null>(
    null,
  );
  const [inputKey, setInputKey] = useState(0);

  const prescriptions = useQuery({
    queryKey: ["prescriptions"],
    queryFn: prescriptionEndpoints.list,
    placeholderData: keepPreviousData,
  });
  const upload = useMutation({
    mutationFn: prescriptionEndpoints.upload,
    onSuccess: () => {
      setFile(null);
      setInputKey((k) => k + 1); // remounts the input, clearing the picked file
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    setFileError(picked ? prescriptionFileError(picked) : null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file && !fileError) upload.mutate(file);
  }

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("prescriptions.title")}
      </h1>
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">
              {t("prescriptions.upload")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <Label htmlFor="prescription-file">
                {t("prescriptions.pick")}
              </Label>
              <Input
                key={inputKey}
                id="prescription-file"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={onPick}
              />
              <p className="text-xs text-muted-foreground">
                {t("prescriptions.hint")}
              </p>
              {fileError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t(`prescriptions.errors.${fileError}`)}
                </p>
              ) : null}
              {upload.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("prescriptions.errors.generic")}
                </p>
              ) : null}
              {upload.isSuccess && !upload.isPending ? (
                <p role="status" className="text-sm text-primary">
                  {t("prescriptions.uploaded")}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={!file || !!fileError || upload.isPending}
              >
                <UploadIcon />
                {upload.isPending
                  ? t("prescriptions.uploading")
                  : t("prescriptions.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">{t("prescriptions.mine")}</h2>
          {prescriptions.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("prescriptions.empty")}
            </p>
          ) : null}
          <ul className="flex flex-col divide-y rounded-2xl border">
            {prescriptions.data?.map((p) => (
              <PrescriptionRow
                key={p.prescription_id}
                prescription={p}
                language={i18n.language}
              />
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function PrescriptionRow({
  prescription,
  language,
}: {
  prescription: Prescription;
  language: string;
}) {
  const { t } = useTranslation();
  const StatusIcon = STATUS_ICON[prescription.status];
  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileTextIcon className="size-4 text-muted-foreground" />#
          {prescription.prescription_id}
          <time
            dateTime={prescription.created_at}
            className="font-normal text-muted-foreground"
          >
            {formatDateTime(prescription.created_at, language)}
          </time>
        </span>
        {prescription.status === "rejected" && prescription.rejection_reason ? (
          <span className="text-xs text-destructive">
            {t("prescriptions.reason", {
              reason: prescription.rejection_reason,
            })}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant={
            prescription.status === "approved"
              ? "secondary"
              : prescription.status === "rejected"
                ? "destructive"
                : "outline"
          }
          className="gap-1"
        >
          <StatusIcon />
          {t(`prescriptions.status.${prescription.status}`)}
        </Badge>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={t("prescriptions.open")}
        >
          <a href={prescription.file_url} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
          </a>
        </Button>
      </div>
    </li>
  );
}
