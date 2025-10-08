import { AppBar } from "@/components/layout/AppBar";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppBar 
        title="Wordle 게임" 
        showBackButton 
        backButtonHref="/demo/decks"
        backButtonText="덱 목록으로"
      />
      {children}
    </>
  );
}

