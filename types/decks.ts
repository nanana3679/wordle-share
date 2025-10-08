import { User } from "@supabase/supabase-js";
import { Tables, TablesInsert, TablesUpdate } from "./database";

export type Deck = Tables<"decks"> & {
  likes?: Array<{
    deck_id: string;
    user_id: string;
    created_at: string;
  }>;
  creator?: User;
  isLiked?: boolean;
  isCreator?: boolean;
};
export type DeckInsert = TablesInsert<"decks">;
export type DeckUpdate = TablesUpdate<"decks">;