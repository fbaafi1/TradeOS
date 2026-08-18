import { redirect } from "next/navigation";
// Risk Calculator is no longer part of Trade OS — position sizing is handled in trade execution
export default function RiskCalculatorPage() {
  redirect("/dashboard");
}
