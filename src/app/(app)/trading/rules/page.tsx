import { redirect } from "next/navigation";
// Trading Rules are now managed in Settings → Trade OS Rules
export default function TradingRulesPage() {
  redirect("/settings/trade-os");
}
