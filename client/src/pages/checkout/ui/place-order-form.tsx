import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useCartStore } from "@/features/cart";
import {
  type OrderCreate,
  orderEndpoints,
  prescriptionEndpoints,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Spinner } from "@/shared/ui/spinner";
import { type IdempotencyEntry, idempotencyFor } from "../model/idempotency";
import { placeOrderErrorKey } from "../model/place-order-error";
import {
  type PlaceOrderValues,
  placeOrderSchema,
} from "../model/place-order-schema";

const OPTION =
  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5";

export function PlaceOrderForm({
  needsPrescription,
}: {
  needsPrescription: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  // Kept across submits so a retry of the same order reuses its Idempotency-Key.
  const attempt = useRef<IdempotencyEntry | null>(null);
  const schema = useMemo(
    () => placeOrderSchema(t, needsPrescription),
    [t, needsPrescription],
  );
  const form = useForm<PlaceOrderValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fulfillment: "pickup",
      address: "",
      payment: "cash",
      prescriptionId: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const fulfillment = form.watch("fulfillment");
  const payment = form.watch("payment");

  const prescriptions = useQuery({
    queryKey: ["prescriptions"],
    queryFn: prescriptionEndpoints.list,
    enabled: needsPrescription,
  });
  const approved = (prescriptions.data ?? []).filter(
    (p) => p.status === "approved",
  );

  async function onSubmit(values: PlaceOrderValues) {
    setServerError(null);
    const body: OrderCreate = {
      items: useCartStore.getState().items.map((i) => ({
        medicine_id: i.medicine_id,
        quantity: i.quantity,
      })),
      fulfillment_type: values.fulfillment,
      delivery_address:
        values.fulfillment === "delivery" ? values.address : null,
      payment_method: values.payment,
      prescription_id: needsPrescription ? Number(values.prescriptionId) : null,
    };
    const entry = idempotencyFor(attempt.current, JSON.stringify(body));
    attempt.current = entry;
    try {
      const order = await orderEndpoints.place(body, entry.key);
      // Navigate before clearing: the cart is empty right after this.
      navigate(`/orders/${order.order_id}?placed=1`, { replace: true });
      useCartStore.getState().clear();
      void queryClient.invalidateQueries({ queryKey: ["medicines"] });
      void queryClient.invalidateQueries({ queryKey: ["medicine"] });
    } catch (error) {
      setServerError(t(placeOrderErrorKey(error)));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            {t("checkout.fulfillment")}
          </legend>
          <Controller
            control={form.control}
            name="fulfillment"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid grid-cols-2 gap-2"
              >
                <Label className={OPTION}>
                  <RadioGroupItem value="pickup" />
                  {t("checkout.pickup")}
                </Label>
                <Label className={OPTION}>
                  <RadioGroupItem value="delivery" />
                  {t("checkout.delivery")}
                </Label>
              </RadioGroup>
            )}
          />
        </fieldset>

        {fulfillment === "delivery" ? (
          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor="checkout-address">
              {t("checkout.address")}
            </FieldLabel>
            <Input
              id="checkout-address"
              autoComplete="street-address"
              aria-invalid={!!errors.address}
              {...form.register("address")}
            />
            <FieldError errors={[errors.address]} />
          </Field>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            {t("checkout.payment")}
          </legend>
          <Controller
            control={form.control}
            name="payment"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid grid-cols-2 gap-2"
              >
                <Label className={OPTION}>
                  <RadioGroupItem value="cash" />
                  {t("checkout.cash")}
                </Label>
                <Label className={OPTION}>
                  <RadioGroupItem value="card_simulated" />
                  {t("checkout.card")}
                </Label>
              </RadioGroup>
            )}
          />
          {payment === "card_simulated" ? (
            <p className="text-xs text-muted-foreground">
              {t("checkout.cardNote")}
            </p>
          ) : null}
        </fieldset>

        {needsPrescription ? (
          <Field data-invalid={!!errors.prescriptionId}>
            <FieldLabel htmlFor="checkout-prescription">
              {t("checkout.prescription")}
            </FieldLabel>
            <NativeSelect
              id="checkout-prescription"
              aria-invalid={!!errors.prescriptionId}
              disabled={approved.length === 0}
              {...form.register("prescriptionId")}
            >
              <NativeSelectOption value="">
                {t("checkout.prescriptionSelect")}
              </NativeSelectOption>
              {approved.map((p) => (
                <NativeSelectOption
                  key={p.prescription_id}
                  value={p.prescription_id}
                >
                  #{p.prescription_id}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {prescriptions.isSuccess && approved.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("checkout.prescriptionNone")}
              </p>
            ) : null}
            <FieldError errors={[errors.prescriptionId]} />
          </Field>
        ) : null}

        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? <Spinner /> : null}
          {isSubmitting ? t("checkout.placing") : t("checkout.place")}
        </Button>
      </FieldGroup>
    </form>
  );
}
