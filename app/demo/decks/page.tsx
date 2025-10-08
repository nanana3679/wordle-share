import { DecksContent } from "@/components/decks/DecksContent";
import { getDecks } from "@/app/actions/deck";

export default async function DecksPage() {
  const { data: decks } = await getDecks();

  return <DecksContent initialDecks={decks || []} />;
}
