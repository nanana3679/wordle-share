import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const acceptLang = (await headers()).get("accept-language");
  const browserLocale = acceptLang?.split(",")[0]?.split("-")[0];

  let locale: Locale = defaultLocale;
  if (cookieLocale && isLocale(cookieLocale)) locale = cookieLocale;
  else if (browserLocale && isLocale(browserLocale)) locale = browserLocale;

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
