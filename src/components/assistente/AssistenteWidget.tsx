import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssistenteChat } from "./AssistenteChat";
import assistenteImg from "@/assets/assistente-sisagro.png";

export function AssistenteWidget() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir ajuda do Sisagro"
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg md:bottom-6 md:right-6"
      >
        {aberto ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <img
                src={assistenteImg}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                className="h-8 w-8"
              />
              Ajuda do Sisagro
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <AssistenteChat onFecharPainel={() => setAberto(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
