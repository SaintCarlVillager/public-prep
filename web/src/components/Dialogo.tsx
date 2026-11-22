"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Confirmações e avisos num <dialog> nativo aberto com showModal(), no lugar de window.confirm/alert:
 * o navegador cuida do foco (vai para o botão seguro e volta a quem abriu), do Esc, do gesto de voltar
 * e de deixar a página inerte. Chame `confirmar` ou `avisar` de qualquer lugar; <Dialogos /> fica no layout.
 */
export type Pedido = {
  titulo: string;
  texto?: string;
  /** Rótulo do botão que confirma: diga a ação ("Apagar sessão"). */
  ok: string;
  /** Rótulo do botão que desiste; sem ele, o diálogo é só um aviso com um botão. */
  cancelar?: string;
  /** Ação destrutiva: o botão de confirmar sai com a cor de erro. */
  perigo?: boolean;
};

type Aberto = Pedido & { responder: (ok: boolean) => void };

let abrir: ((p: Aberto) => void) | null = null;
let fechar: (() => void) | null = null;

/** Pergunta e resolve `true` só se a pessoa escolher o botão de confirmar (Esc ou clique fora = `false`). */
export function confirmar(p: Omit<Pedido, "cancelar"> & { cancelar?: string }): Promise<boolean> {
  return new Promise((responder) => {
    if (!abrir) return responder(false);
    abrir({ cancelar: "Cancelar", ...p, responder });
  });
}

/** Aviso com um único botão. */
export function avisar(titulo: string, texto?: string): Promise<void> {
  return new Promise((ok) => {
    if (!abrir) return ok();
    abrir({ titulo, texto, ok: "Entendi", responder: () => ok() });
  });
}

/** Fecha o diálogo aberto, se houver, como se a pessoa tivesse desistido (ex.: o tempo do simulado acabou). */
export function fecharDialogo() {
  fechar?.();
}

export function Dialogos() {
  const ref = useRef<HTMLDialogElement>(null);
  const [pedido, setPedido] = useState<Aberto | null>(null);
  const atual = useRef<Aberto | null>(null);
  const id = useId();

  useEffect(() => {
    abrir = (p) => {
      // Um pedido novo encerra o anterior como "desistiu".
      atual.current?.responder(false);
      atual.current = p;
      setPedido(p);
    };
    fechar = () => ref.current?.close();
    return () => {
      abrir = null;
      fechar = null;
    };
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (pedido && d && !d.open) d.showModal();
  }, [pedido]);

  const aoFechar = () => {
    const d = ref.current;
    if (!d) return;
    // Esc e outros pedidos de fechar não definem returnValue; zera para não vazar o valor anterior.
    const ok = d.returnValue === "ok";
    d.returnValue = "";
    const p = atual.current;
    atual.current = null;
    setPedido(null);
    p?.responder(ok);
  };

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby={`${id}-t`}
      aria-describedby={pedido?.texto ? `${id}-d` : undefined}
      onClose={aoFechar}
      // closedby ainda não está nos tipos do React; "any" fecha também com clique fora (onde houver suporte).
      {...({ closedby: "any" } as Record<string, string>)}
    >
      {pedido && (
        <form method="dialog">
          <h2 id={`${id}-t`}>{pedido.titulo}</h2>
          {pedido.texto && <p id={`${id}-d`}>{pedido.texto}</p>}
          {/* O botão seguro vem primeiro: showModal() leva o foco a ele (o autoFocus do React roda antes de o diálogo abrir). */}
          <div className="dialogo-botoes">
            {pedido.cancelar && (
              <button className="btn ghost" value="cancelar">
                {pedido.cancelar}
              </button>
            )}
            <button className={`btn${pedido.perigo ? " perigo" : ""}`} value="ok">
              {pedido.ok}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
