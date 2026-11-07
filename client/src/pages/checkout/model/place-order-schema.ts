import type { TFunction } from "i18next";
import { z } from "zod";

export const placeOrderSchema = (t: TFunction, needsPrescription: boolean) =>
  z
    .object({
      fulfillment: z.enum(["pickup", "delivery"]),
      address: z.string().trim(),
      payment: z.enum(["cash", "card_simulated"]),
      prescriptionId: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.fulfillment === "delivery" && !values.address) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: t("checkout.validation.addressRequired"),
        });
      }
      if (needsPrescription && !values.prescriptionId) {
        ctx.addIssue({
          code: "custom",
          path: ["prescriptionId"],
          message: t("checkout.validation.prescriptionRequired"),
        });
      }
    });

export type PlaceOrderValues = z.infer<ReturnType<typeof placeOrderSchema>>;
