import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssistenteChat } from "./AssistenteChat";
import assistenteImg from "@/assets/assistente-sisagro.png";

const TAMANHO = 64;
const MARGEM = 16;
const STORAGE_KEY = "sisagro-ajuda-posicao";

interface Posicao {
  x: number;
  y: number;
}

/** Limita a posição para o botão nunca sair da tela. */
function limitar(p: Posicao): Posicao {
  const maxX = window.innerWidth - TAMANHO - 4;
  const maxY = window.innerHeight - TAMANHO - 4;
  return { x: Math.min(Math.max(4, p.x), maxX), y: Math.min(Math.max(4, p.y), maxY) };
}

function posicaoInicial(): Posicao {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      const p = JSON.parse(salvo) as Posicao;
      if (typeof p.x === "number" && typeof p.y === "number") return limitar(p);
    }
  } catch {
    /* ignora posição inválida */
  }
  return limitar({
    x: window.innerWidth - TAMANHO - MARGEM,
    y: window.innerHeight - TAMANHO - MARGEM,
  });
}

export function AssistenteWidget() {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<Posicao>(posicaoInicial);
  const arraste = useRef<{ dx: number; dy: number; moveu: boolean; inicioX: number; inicioY: number } | null>(null);

  // Mantém o botão visível ao redimensionar a janela
  useEffect(() => {
    const onResize = () => setPos((p) => limitar(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arraste.current = {
      dx: e.clientX - pos.x,
      dy: e.clientY - pos.y,
      moveu: false,
      inicioX: e.clientX,
      inicioY: e.clientY,
    };
  }, [pos]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const a = arraste.current;
    if (!a) return;
    if (!a.moveu && Math.hypot(e.clientX - a.inicioX, e.clientY - a.inicioY) < 5) return;
    a.moveu = true;
    setPos(limitar({ x: e.clientX - a.dx, y: e.clientY - a.dy }));
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const a = arraste.current;
    arraste.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (a?.moveu) {
      setPos((p) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        return p;
      });
    } else {
      setAberto(true);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto(true);
          }
        }}
        aria-label="Abrir ajuda do Sisagro (arraste para mover)"
        title="Ajuda do Sisagro — arraste para mover"
        style={{ left: pos.x, top: pos.y, width: TAMANHO, height: TAMANHO }}
        className="fixed z-50 flex touch-none select-none items-center justify-center rounded-full border-2 border-primary bg-card shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing"
      >
        <img
          src={assistenteImg}
          alt=""
          draggable={false}
          width={48}
          height={48}
          className="pointer-events-none h-12 w-12"
        />
      </button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <img src={assistenteImg} alt="" width={32} height={32} loading="lazy" className="h-8 w-8" />
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
