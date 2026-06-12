import type { Metadata } from "next";
import { DeckForm } from "@/components/DeckForm";

export const metadata: Metadata = {
  title: "새 덱 만들기 | wordledecks",
};

export default function NewDeckPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">새 덱 만들기</h1>
      <DeckForm />
    </main>
  );
}
