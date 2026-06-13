import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getFeed, type FeedSort } from "@/app/actions/feed";
import { FeedTabs } from "@/components/FeedTabs";
import { FeedList } from "@/components/FeedList";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";

interface HomePageProps {
  searchParams: Promise<{ sort?: string }>;
}

function resolveSort(raw: string | undefined): FeedSort {
  return raw === "likes" || raw === "new" ? raw : "hot"; // Hot 탭 기본 (AC)
}

export default async function Home({ searchParams }: HomePageProps) {
  const { sort: rawSort } = await searchParams;
  const sort = resolveSort(rawSort);
  const t = await getTranslations("layout.appbar");

  const result = await getFeed({ sort });
  const page = result.success && result.data ? result.data : { decks: [], nextOffset: null };

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">wordledecks</h1>
        <div className="flex-1">
          <SearchBar />
        </div>
        <Button asChild size="sm">
          <Link href="/d/new">{t("newDeck")}</Link>
        </Button>
      </div>

      <FeedTabs active={sort} />
      <FeedList initialDecks={page.decks} initialNextOffset={page.nextOffset} sort={sort} />
    </main>
  );
}
