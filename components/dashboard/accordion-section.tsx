"use client";

import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function AccordionSection({
  title,
  defaultOpen = false,
  children,
  className,
}: AccordionSectionProps) {
  return (
    <Accordion
      defaultValue={defaultOpen ? ["section"] : []}
      className={cn("border-b border-border-light", className)}
    >
      <AccordionItem value="section">
        <AccordionTrigger className="py-4 px-1 text-sm text-foreground  hover:no-underline transition-colors rounded-none">
          {title}
        </AccordionTrigger>
        {children && (
          <AccordionContent className="px-1 text-foreground">
            {children}
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  );
}

export function DeviceItem() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-10 relative rounded-lg overflow-hidden bg-muted">
        <Image
          src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=70&fit=crop"
          alt="MacBook Air"
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">MacBook Air</p>
        <p className="text-xs text-muted-foreground">Version M1</p>
      </div>
      <Button variant="ghost" size="icon-sm">
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
