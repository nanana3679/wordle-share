import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FeedSort } from "@/app/actions/feed";

const TAB_SORTS: { sort: FeedSort; href: string }[] = [
  { sort: "hot", href: "/" },
  { sort: "likes", href: "/?sort=likes" },
  { sort: "new", href: "/?sort=new" },
];

export async function FeedTabs({ active }: { active: FeedSort }) {
  const t = await getTranslations("layout.feedTabs");

  return (
    <nav className="flex gap-1 border-b">
      {TAB_SORTS.map((tab) => (
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
          {t(tab.sort)}
        </Link>
      ))}
    </nav>
  );
}
