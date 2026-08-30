import LoaderOne from "@/components/ui/loader-one";

export function ScanningPanel() {
  return (
    <div className="flex flex-col items-center gap-4 pt-12 text-center text-brand">
      <LoaderOne />
      <p className="text-sm text-muted-foreground">
        Liest Brand, Format, Budget und Creator aus…
      </p>
    </div>
  );
}
