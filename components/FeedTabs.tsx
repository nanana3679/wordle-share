import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FeedSort } from "@/app/actions/feed";

const TABS: { sort: FeedSort; label: string; href: string }[] = [
  { sort: "hot", label: "🔥 Hot", href: "/" },
  { sort: "likes", label: "좋아요순", href: "/?sort=likes" },
  { sort: "new", label: "최신순", href: "/?sort=new" },
];

export function FeedTabs({ active }: { active: FeedSort }) {
  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.sort}
          href={tab.href}
          className={cn(
            "px-3 py-2 text-sm font-medium",
            active === tab.sort
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
