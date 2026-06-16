import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageTopBarProps {
  backHref: string;
  backLabel: string;
}

export function PageTopBar({ backHref, backLabel }: PageTopBarProps) {
  return (
    <div className="flex min-h-9 items-center">
      <Button asChild variant="ghost" size="sm">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      </Button>
    </div>
  );
}
