import type { Metadata } from "next";
import { searchDecks } from "@/app/actions/feed";
import { SearchBar } from "@/components/SearchBar";
import { FeedList } from "@/components/FeedList";

export const metadata: Metadata = {
  title: "덱 검색 | wordledecks",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

// 덱 이름 키워드 검색 — 단어 내용 매칭 없음 (ADR 0008)
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const result = await searchDecks({ q });
  const page = result.success && result.data ? result.data : { decks: [], nextOffset: null };

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <SearchBar defaultValue={q} />
      <FeedList
        initialDecks={page.decks}
        initialNextOffset={page.nextOffset}
        sort="likes"
        query={q}
      />
    </main>
  );
}
