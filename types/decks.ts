import { User } from "@supabase/supabase-js";
import { Tables, TablesInsert, TablesUpdate } from "./database";

export type DeckWord = { word: string; tags: string[] };

// 서버 액션이 응답에서 author_password_hash를 제외하므로 클라이언트 타입도 제외
export type Deck = Omit<Tables<"decks">, "author_password_hash"> & {
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
