import { Clock, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  phase: string;
  features?: string[];
}

export function ComingSoon({ title, description, phase, features }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md w-full text-center px-4">
        {/* Phase badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
          <Sparkles className="h-3 w-3" />
          {phase}
        </div>

        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Clock className="h-8 w-8 text-muted-foreground/50" />
        </div>

        {/* Title & description */}
        <h1 className="text-2xl font-bold mb-3">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>

        {/* Features list */}
        {features && features.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              What&apos;s planned
            </p>
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
