import { CreditCardIcon, FileTextIcon, PackageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AppShell } from "@/widgets/layout";
import { OrdersPanel } from "./orders-panel";
import { PosPanel } from "./pos-panel";
import { PrescriptionsPanel } from "./prescriptions-panel";

export function StaffPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("auth.staff.title")}
      </h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger
            value="orders"
            aria-label={t("staff.tabs.orders")}
            title={t("staff.tabs.orders")}
          >
            <PackageIcon />
            {t("staff.tabs.orders")}
          </TabsTrigger>
          <TabsTrigger
            value="prescriptions"
            aria-label={t("staff.tabs.prescriptions")}
            title={t("staff.tabs.prescriptions")}
          >
            <FileTextIcon />
            {t("staff.tabs.prescriptions")}
          </TabsTrigger>
          <TabsTrigger
            value="pos"
            aria-label={t("staff.tabs.pos")}
            title={t("staff.tabs.pos")}
          >
            <CreditCardIcon />
            {t("staff.tabs.pos")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <OrdersPanel />
        </TabsContent>
        <TabsContent value="prescriptions" className="mt-4">
          <PrescriptionsPanel />
        </TabsContent>
        <TabsContent value="pos" className="mt-4">
          <PosPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
