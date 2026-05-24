import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CreatorCardProps {
  name: string;
  role: string;
  salary: string;
  imageUrl: string;
  className?: string;
}

export function CreatorCard({
  name,
  role,
  salary,
  imageUrl,
  className,
}: CreatorCardProps) {
  return (
    <Card
      className={cn(
        "relative min-h-70 rounded-2xl p-0 gap-0 bg-transparent ring-0",
        className,
      )}
    >
      <Image src={imageUrl} alt={name} fill className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <CardHeader className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-0 items-end rounded-none border-0">
        <CardTitle className="text-xl font-semibold text-white">
          {name}
        </CardTitle>
        <CardDescription className="text-white/80">{role}</CardDescription>
        <CardAction className="self-end">
          <Badge
            variant="default"
            className="rounded-full px-4 py-1.5 h-auto text-sm font-semibold"
          >
            {salary}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
