"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

const LOCALES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
] as const;

export function LocaleSwitcher() {
  const t = useTranslations("common.localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(code: Locale) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("label")}
          disabled={isPending}
          className="gap-1.5"
        >
          <Globe className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end" sideOffset={4}>
        <ul className="flex flex-col gap-0.5">
          {LOCALES.map(({ code, label }) => {
            const isCurrent = code === locale;
            return (
              <li key={code}>
                <button
                  disabled={isCurrent}
                  onClick={() => handleSelect(code)}
                  className={cn(
                    "w-full rounded-sm px-3 py-1.5 text-left text-sm transition-colors",
                    isCurrent
                      ? "cursor-default font-semibold opacity-50"
                      : "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground outline-none"
                  )}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
