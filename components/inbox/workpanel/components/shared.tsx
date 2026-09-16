import { cn } from "@/lib/utils";
import { AttachmentBadge } from "./attachment-badge";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function FormField({
  label,
  uncertain,
  source,
  children,
}: {
  label: string;
  uncertain?: boolean;
  /** Filename of the attachment this field's value was extracted from, if any. */
  source?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5">
      <p className={cn(
        "mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
      )}>
        {label}
        {uncertain && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
            prüfen
          </span>
        )}
        {source && <AttachmentBadge filename={source} />}
      </p>
      {children}
    </div>
  );
}
