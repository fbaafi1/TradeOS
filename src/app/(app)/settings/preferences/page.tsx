import { getRiskSettings } from "@/lib/data/queries";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { Settings2 } from "lucide-react";

export const metadata = { title: "Preferences — TradeOS" };

export default async function PreferencesPage() {
  const riskSettings = await getRiskSettings();
  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Preferences</h1>
          <p className="text-sm text-muted-foreground">Configure your risk defaults and account settings</p>
        </div>
      </div>
      <PreferencesForm initialSettings={riskSettings} />
    </div>
  );
}
