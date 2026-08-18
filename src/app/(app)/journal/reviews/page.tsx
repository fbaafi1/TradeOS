import { ComingSoon } from "@/components/shared/coming-soon";

export default function JournalReviewsPage() {
  return (
    <ComingSoon
      title="Reviews"
      description="Daily and weekly session reviews. Reflect on your performance, plan improvements, and track your growth. Coming in Phase 6."
      phase="Phase 6"
      features={[
        "Auto-generated weekly performance summary",
        "Discipline score per week",
        "Best and worst trading behavior highlights",
        "Set focus goals for next week",
      ]}
    />
  );
}
