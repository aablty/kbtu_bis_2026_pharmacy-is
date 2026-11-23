import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  FlashlightIcon,
  PlusIcon,
  QrCodeIcon,
  ReceiptIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import {
  catalogEndpoints,
  getByBarcodeBatchesByBarcodeBarcodeGet,
  getSaleSalesSaleIdGet,
  type Medicine,
  type Sale,
  staffEndpoints,
  type UserSearchResult,
  userEndpoints,
} from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { ListEmpty } from "@/shared/ui/list-empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

interface Line {
  medicine: Medicine;
  quantity: number;
}

export function PosPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<UserSearchResult | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<"unknown" | "outOfStock" | null>(
    null,
  );
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const recent = useQuery({
    queryKey: ["staff-sales"],
    queryFn: staffEndpoints.sales.list,
  });

  const results = useQuery({
    queryKey: ["pos-search", query],
    queryFn: () =>
      catalogEndpoints.medicines({ q: query, limit: 10, offset: 0 }),
    enabled: query.length >= 2,
  });

  const customerResults = useQuery({
    queryKey: ["customer-search", customerQuery],
    queryFn: () => userEndpoints.search(customerQuery),
    enabled: customerQuery.length >= 2,
  });

  // Debounce so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(
      () => setCustomerQuery(customerSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const saleDetail = useQuery({
    queryKey: ["staff-sale", selectedSaleId],
    queryFn: () => getSaleSalesSaleIdGet(selectedSaleId as number),
    enabled: selectedSaleId !== null,
  });

  const sell = useMutation({
    mutationFn: staffEndpoints.sales.create,
    onSuccess: (sale) => {
      setReceipt(sale);
      setLines([]);
      setSelectedCustomer(null);
      setCustomerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["staff-sales"] });
      void queryClient.invalidateQueries({ queryKey: ["medicines"] });
      void queryClient.invalidateQueries({ queryKey: ["medicine"] });
    },
  });

  function add(medicine: Medicine) {
    setReceipt(null);
    sell.reset();
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.medicine.medicine_id === medicine.medicine_id,
      );
      if (!existing) return [...prev, { medicine, quantity: 1 }];
      return prev.map((l) =>
        l === existing
          ? {
              ...l,
              quantity: Math.min(l.quantity + 1, medicine.stock_quantity),
            }
          : l,
      );
    });
  }

  // Scans a batch barcode via the device camera and adds the matching medicine to the sale.
  // The stream is opened directly (rather than via decodeOnceFromVideoDevice) so the torch
  // toggle below can feature-detect and control the same MediaStreamTrack.
  // biome-ignore lint/correctness/useExhaustiveDependencies: add is recreated every render; including it would restart the scanner mid-scan
  useEffect(() => {
    if (!scanOpen) return;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    async function run() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        setTorchSupported(
          track
            ? BrowserQRCodeReader.mediaStreamIsTorchCompatibleTrack(track)
            : false,
        );

        const result = await reader.decodeOnceFromStream(
          stream,
          videoRef.current ?? undefined,
        );
        if (cancelled) return;
        const barcode = result.getText();
        const batch = await getByBarcodeBatchesByBarcodeBarcodeGet(barcode);
        if (cancelled) return;
        if (batch.quantity_remaining <= 0) {
          setScanError("outOfStock");
          setScanOpen(false);
          return;
        }
        const medicine = await catalogEndpoints.medicine(batch.medicine_id);
        if (cancelled) return;
        add(medicine);
        setScanOpen(false);
      } catch {
        if (!cancelled) {
          setScanError("unknown");
          setScanOpen(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
      BrowserQRCodeReader.releaseAllStreams();
    };
  }, [scanOpen]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    await BrowserQRCodeReader.mediaStreamSetTorch(track, next);
    setTorchOn(next);
  }

  function setQuantity(medicineId: number, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.medicine.medicine_id === medicineId ? { ...l, quantity } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  const total = lines.reduce(
    (sum, l) => sum + Number(l.medicine.price) * l.quantity,
    0,
  );
  const valid = lines.length > 0 && lines.every((l) => l.quantity > 0);

  // The sale form is the same on phones (bottom sheet) and desktop (side column).
  const saleForm = (
    <>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("staff.pos.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((l) => (
            <li
              key={l.medicine.medicine_id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{l.medicine.name}</span>
              <Input
                type="number"
                min={1}
                max={l.medicine.stock_quantity}
                aria-label={t("staff.pos.quantity")}
                value={l.quantity}
                onChange={(e) =>
                  setQuantity(l.medicine.medicine_id, Number(e.target.value))
                }
                className="w-20"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("cart.remove")}
                onClick={() => setQuantity(l.medicine.medicine_id, 0)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Linking a customer is optional - a sale with no selection stays a walk-in sale. */}
      <Collapsible open={customerOpen} onOpenChange={setCustomerOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <UserPlusIcon className="size-4" />
            {selectedCustomer
              ? t("staff.pos.customerLinked", {
                  name: selectedCustomer.full_name ?? selectedCustomer.email,
                })
              : t("staff.pos.customer")}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Field>
            <FieldLabel htmlFor="pos-customer">
              {t("staff.pos.customerLabel")}
            </FieldLabel>
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border p-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {selectedCustomer.full_name ?? selectedCustomer.email}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {selectedCustomer.email}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("staff.pos.customerClear")}
                  onClick={() => setSelectedCustomer(null)}
                >
                  <XIcon />
                </Button>
              </div>
            ) : (
              <Command shouldFilter={false} className="rounded-xl border">
                <CommandInput
                  id="pos-customer"
                  value={customerSearch}
                  onValueChange={setCustomerSearch}
                  placeholder={t("staff.pos.customerLabel")}
                />
                <CommandList>
                  <CommandEmpty>
                    {t("staff.pos.customerNoResults")}
                  </CommandEmpty>
                  {customerResults.data?.map((user) => (
                    <CommandItem
                      key={user.user_id}
                      value={String(user.user_id)}
                      onSelect={() => {
                        setSelectedCustomer(user);
                        setCustomerSearch("");
                      }}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">
                          {user.full_name ?? user.email}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            )}
          </Field>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">
          {t("cart.subtotal")}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {formatPrice(String(total), i18n.language)}
        </span>
      </div>
      <Button
        className="w-full"
        disabled={!valid || sell.isPending}
        onClick={() =>
          sell.mutate({
            items: lines.map((l) => ({
              medicine_id: l.medicine.medicine_id,
              quantity: l.quantity,
            })),
            customer_id: selectedCustomer?.user_id ?? null,
          })
        }
      >
        {sell.isPending ? t("staff.pos.selling") : t("staff.pos.submit")}
      </Button>
      {sell.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("staff.errors.generic")}
        </p>
      ) : null}
      {receipt ? (
        <p role="status" className="text-sm text-primary">
          {t("staff.pos.receipt", {
            id: receipt.sale_id,
            total: formatPrice(receipt.total_amount, i18n.language),
          })}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto_20rem]">
      <section className="flex flex-col gap-3 rounded-2xl border p-4">
        <h2 className="text-sm font-medium">{t("staff.pos.step1")}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="flex gap-2"
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("staff.pos.search")}
            aria-label={t("staff.pos.search")}
          />
          <Button type="submit" variant="outline">
            {t("catalog.searchSubmit")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("staff.pos.scan")}
            title={t("staff.pos.scan")}
            onClick={() => {
              setScanError(null);
              setScanOpen(true);
            }}
          >
            <QrCodeIcon />
          </Button>
        </form>

        {scanError ? (
          <p role="alert" className="text-sm text-destructive">
            {scanError === "outOfStock"
              ? t("staff.pos.scanOutOfStock")
              : t("staff.pos.scanError")}
          </p>
        ) : null}

        {/* Phones: the sale opens in a sheet, so the search results stay on screen. */}
        <div className="sticky bottom-4 z-10 md:hidden">
          <Sheet open={saleOpen} onOpenChange={setSaleOpen}>
            <SheetTrigger asChild>
              <Button
                variant="default"
                className="h-12 w-full justify-between shadow-lg"
              >
                <span>{t("staff.pos.sale")}</span>
                <span className="tabular-nums">
                  {lines.length} · {formatPrice(String(total), i18n.language)}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85svh] gap-4 overflow-y-auto rounded-t-2xl p-4"
            >
              <SheetHeader>
                <SheetTitle>{t("staff.pos.sale")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4">{saleForm}</div>
            </SheetContent>
          </Sheet>
        </div>

        <ul className="flex flex-col divide-y rounded-xl border empty:hidden">
          {results.data?.items.map((m) => (
            <li
              key={m.medicine_id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPrice(m.price, i18n.language)} · {t("staff.pos.stock")}
                  : {m.stock_quantity}
                </span>
              </span>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={m.stock_quantity <= 0}
                aria-label={t("staff.pos.add")}
                title={t("staff.pos.add")}
                onClick={() => add(m)}
              >
                <PlusIcon />
              </Button>
            </li>
          ))}
        </ul>

        <h2 className="mt-2 text-sm font-medium">{t("staff.pos.recent")}</h2>
        {recent.data && recent.data.length === 0 ? (
          <ListEmpty
            icon={ReceiptIcon}
            title={t("list.sales.title")}
            description={t("list.sales.hint")}
          />
        ) : null}
        <ul className="flex flex-col divide-y rounded-xl border empty:hidden">
          {recent.data?.slice(0, 10).map((sale) => (
            <li key={sale.sale_id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-accent"
                onClick={() => setSelectedSaleId(sale.sale_id)}
              >
                <span>
                  #{sale.sale_id}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDateTime(sale.created_at, i18n.language)}
                  </span>
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  {formatPrice(sale.total_amount, i18n.language)}
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="hidden items-center justify-center md:flex">
        <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground" />
      </div>

      <aside className="hidden flex-col gap-3 rounded-2xl border p-4 md:flex">
        <h2 className="text-sm font-medium">{t("staff.pos.step2")}</h2>
        {saleForm}
      </aside>

      <Dialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) setScanError(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("staff.pos.scan")}</DialogTitle>
          </DialogHeader>
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="aspect-square w-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/80" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("staff.pos.scanHint")}
          </p>
          {torchSupported ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={toggleTorch}
            >
              <FlashlightIcon />
              {torchOn ? t("staff.pos.torchOff") : t("staff.pos.torchOn")}
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet
        open={selectedSaleId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSaleId(null);
        }}
      >
        <SheetContent className="gap-4 overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>
              {selectedSaleId !== null
                ? t("staff.pos.saleDetail", { id: selectedSaleId })
                : ""}
            </SheetTitle>
          </SheetHeader>
          {saleDetail.data ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">
                  {t("staff.pos.saleTime")}
                </dt>
                <dd className="text-right">
                  {formatDateTime(saleDetail.data.created_at, i18n.language)}
                </dd>
                <dt className="text-muted-foreground">
                  {t("staff.pos.customer")}
                </dt>
                <dd className="text-right">
                  {saleDetail.data.customer_id ?? t("staff.pos.walkIn")}
                </dd>
              </dl>
              <ul className="flex flex-col divide-y rounded-xl border">
                {saleDetail.data.items.map((item) => (
                  <li
                    key={item.medicine_id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {item.medicine_name} × {item.quantity}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(item.unit_price, i18n.language)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {t("cart.subtotal")}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatPrice(saleDetail.data.total_amount, i18n.language)}
                </span>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
