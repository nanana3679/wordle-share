import { getTranslations } from "next-intl/server";
import { Input } from "@/components/ui/input";

// GET form — /search?q=... 로 이동 (서버 컴포넌트에서 사용 가능)
export async function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const t = await getTranslations("layout.searchBar");

  return (
    <form action="/search" className="w-full">
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={t("placeholder")}
        maxLength={50}
        aria-label={t("ariaLabel")}
      />
    </form>
  );
}
