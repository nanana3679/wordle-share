import { Input } from "@/components/ui/input";

// GET form — /search?q=... 로 이동 (서버 컴포넌트에서 사용 가능)
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" className="w-full">
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="덱 이름 검색"
        maxLength={50}
        aria-label="덱 이름 검색"
      />
    </form>
  );
}
