import { redirect } from "next/navigation";
// Trade Simulator is replaced by the daily Trade Execution section in /day/[date]
export default function SimulatorPage() {
  const today = new Date().toISOString().split("T")[0];
  redirect(`/day/${today}`);
}
