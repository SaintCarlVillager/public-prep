"use client";
// App instalável (PWA): registra o service worker (public/sw.js), guarda o convite de instalação do navegador
// e oferece a instalação no Painel e em Ajustes. No iPhone, que não tem convite, mostra o caminho pelo Safari.

import { useEffect, useState, useSyncExternalStore } from "react";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

/** O evento `beforeinstallprompt` (Chrome, Edge, Samsung Internet), que ainda não está nos tipos do DOM. */
interface ConviteInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Guardado pelo script do <head> (layout.tsx), que roda antes do React. */
    __convite?: ConviteInstalacao | null;
  }
  interface Navigator {
    standalone?: boolean;
    /** Web Install API (navigator.install), onde houver. */
    install?: () => Promise<unknown>;
  }
}

/** Script do <head>: o convite pode chegar antes de o React montar, então é guardado já no carregamento. */
export const SCRIPT_CONVITE =
  "addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__convite=e;dispatchEvent(new Event('serventia:convite'))});" +
  "addEventListener('appinstalled',function(){window.__convite=null;dispatchEvent(new Event('serventia:convite'))});";

export type Instalacao =
  /** Aberto como app (tela inicial ou janela própria). */
  | "instalado"
  /** O navegador deixa instalar por um botão nosso. */
  | "pronto"
  /** iPhone ou iPad: instala pelo menu Compartilhar do Safari. */
  | "ios"
  /** Nada a oferecer (já instalado e aberto no navegador, ou navegador sem instalação). */
  | "indisponivel";

const aberto = () =>
  typeof window !== "undefined" &&
  (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true);

const ehIos = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

function estado(): Instalacao {
  if (aberto()) return "instalado";
  if (typeof navigator.install === "function" || window.__convite) return "pronto";
  if (ehIos()) return "ios";
  return "indisponivel";
}

function assinar(avisar: () => void) {
  addEventListener("serventia:convite", avisar);
  const mq = matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", avisar);
  return () => {
    removeEventListener("serventia:convite", avisar);
    mq.removeEventListener("change", avisar);
  };
}

/** Situação da instalação e a ação de instalar (chamar direto do clique: o navegador exige o gesto). */
export function useInstalacao() {
  const situacao = useSyncExternalStore(assinar, estado, () => "indisponivel" as Instalacao);
  const instalar = async (): Promise<"aceito" | "recusado"> => {
    try {
      if (typeof navigator.install === "function") {
        await navigator.install();
        return "aceito";
      }
      const convite = window.__convite;
      if (!convite) return "recusado";
      window.__convite = null; // o convite só serve uma vez
      await convite.prompt();
      const { outcome } = await convite.userChoice;
      dispatchEvent(new Event("serventia:convite"));
      if (outcome === "accepted") void guardarDeVez();
      return outcome === "accepted" ? "aceito" : "recusado";
    } catch {
      dispatchEvent(new Event("serventia:convite"));
      return "recusado";
    }
  };
  return { situacao, instalar };
}

/** Pede ao navegador para não apagar o progresso (localStorage) e os dados offline quando faltar espaço. */
export async function guardarDeVez() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* sem suporte: segue como está */
  }
}

/** Registra o service worker (só no build de produção) e, aberto como app, pede armazenamento persistente. */
export function RegistrarPwa() {
  useEffect(() => {
    if (aberto()) void guardarDeVez();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const versao = process.env.NEXT_PUBLIC_VERSAO ?? "1";
    const registrar = () => void navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(versao)}`).catch(() => {});
    // Depois do carregamento, para não disputar a rede com a primeira tela.
    if (document.readyState === "complete") registrar();
    else addEventListener("load", registrar, { once: true });
  }, []);
  return null;
}

/** Texto do caminho no iPhone e iPad. */
export function PassosIos() {
  return (
    <>
      No Safari, toque em <strong>Compartilhar</strong> (ou no menu <strong>···</strong>) e em{" "}
      <strong>Adicionar à Tela de Início</strong>. O app instalado começa sem o seu progresso: exporte-o em Ajustes e importe
      lá.
    </>
  );
}

const CHAVE_DISPENSA = "public-prep:instalar-dispensado";
const DIAS_DISPENSA = 30;

function dispensadoRecente() {
  try {
    const v = localStorage.getItem(CHAVE_DISPENSA);
    return !!v && Date.now() - Number(v) < DIAS_DISPENSA * 864e5;
  } catch {
    return false;
  }
}

/** Convite no topo do Painel: some ao instalar ou por 30 dias ao dispensar. */
export function OfertaInstalar() {
  const { situacao, instalar } = useInstalacao();
  const [dispensado, setDispensado] = useState(true);
  useEffect(() => setDispensado(dispensadoRecente()), []);
  // No iPhone, só no celular de fato (no iPad o app já abre bem no Safari).
  if (dispensado || (situacao !== "pronto" && !(situacao === "ios" && /iPhone|iPod/.test(navigator.userAgent)))) return null;

  const dispensar = () => {
    try {
      localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
    } catch {
      /* armazenamento bloqueado: some só nesta visita */
    }
    setDispensado(true);
  };

  return (
    <Banner
      status="info"
      title="Instale a ServentIA no celular"
      description={
        <VStack gap={1}>
          <Text as="p">Abre direto da tela inicial, em tela cheia, e as questões funcionam mesmo sem internet.</Text>
          {situacao === "ios" && (
            <Text as="p">
              <PassosIos />
            </Text>
          )}
        </VStack>
      }
      endContent={situacao === "pronto" ? <Button label="Instalar" variant="primary" onClick={() => void instalar()} /> : undefined}
      isDismissable
      dismissLabel="Agora não"
      onDismiss={dispensar}
      collapsible={false}
    />
  );
}

/* ---------- Ajustes: app no celular e lei seca offline ---------- */

const CACHE_DADOS = "serventia-dados";
const urlLei = (sigla: string) => `/dados/leis/${encodeURIComponent(sigla)}.json`;

/** Quantas das normas já estão guardadas pelo service worker neste aparelho. */
async function leisGuardadas(siglas: string[]): Promise<number> {
  if (!("caches" in window)) return 0;
  const cache = await caches.open(CACHE_DADOS);
  const tem = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  return siglas.filter((s) => tem.has(urlLei(s))).length;
}

const mb = (b: number) => `${(b / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;

/** Cartão de Ajustes: instalar o app e baixar a lei seca para usar sem internet. */
export function AppNoCelular({ siglas }: { siglas: string[] }) {
  const { situacao, instalar } = useInstalacao();
  const [ativo, setAtivo] = useState(false); // o service worker já atende esta página
  const [guardadas, setGuardadas] = useState<number | null>(null);
  const [baixando, setBaixando] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let vivo = true;
    void navigator.serviceWorker.ready.then(async () => {
      if (!vivo) return;
      setAtivo(true);
      setGuardadas(await leisGuardadas(siglas));
    });
    return () => {
      vivo = false;
    };
  }, [siglas]);

  const baixar = async () => {
    setBaixando(0);
    setMsg("");
    void guardarDeVez();
    const fila = [...siglas];
    let feitas = 0;
    let falhas = 0;
    // Quatro de cada vez: o celular não engasga e a barra de progresso anda.
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let s = fila.shift(); s; s = fila.shift()) {
          try {
            const r = await fetch(urlLei(s));
            if (!r.ok) throw new Error();
            await r.arrayBuffer(); // o service worker guarda a resposta no caminho
          } catch {
            falhas++;
          }
          setBaixando(++feitas);
        }
      }),
    );
    setBaixando(null);
    setGuardadas(await leisGuardadas(siglas));
    const uso = await navigator.storage?.estimate?.().catch(() => undefined);
    setMsg(
      falhas
        ? `${falhas} ${falhas === 1 ? "norma não baixou" : "normas não baixaram"}. Confira a conexão e tente de novo.`
        : `Lei seca guardada neste aparelho.${uso?.usage ? ` O app ocupa ${mb(uso.usage)}.` : ""}`,
    );
  };

  return (
    <VStack gap={4}>
      {situacao === "instalado" ? (
        <Text as="p" color="secondary">
          Você está usando o app instalado.
        </Text>
      ) : situacao === "pronto" ? (
        <VStack gap={2} align="start">
          <Text as="p" color="secondary">
            Instale para abrir direto da tela inicial, em tela cheia.
          </Text>
          <Button label="Instalar o app" variant="primary" onClick={() => void instalar()} />
        </VStack>
      ) : situacao === "ios" ? (
        <Text as="p" color="secondary">
          <PassosIos />
        </Text>
      ) : (
        <Text as="p" color="secondary">
          Para instalar, use o menu do navegador (“Instalar app” ou “Adicionar à tela inicial”). Se ele não tiver essa opção, abra
          o app no Chrome, no Edge ou no Safari.
        </Text>
      )}
      {ativo && (
        <VStack gap={2} align="start">
          <Text as="p" color="secondary">
            As questões já ficam guardadas para estudar sem internet. A lei seca é maior e fica guardada quando você abre cada norma,
            ou toda de uma vez aqui.
          </Text>
          <Button
            label={
              baixando !== null
                ? `Baixando… ${baixando} de ${siglas.length}`
                : guardadas === siglas.length
                  ? "Atualizar a lei seca guardada"
                  : "Baixar a lei seca"
            }
            isLoading={baixando !== null}
            onClick={() => void baixar()}
          />
          <Text as="p" type="supporting" color="secondary" role="status">
            {msg || (guardadas !== null ? `${guardadas} de ${siglas.length} normas guardadas neste aparelho.` : "")}
          </Text>
        </VStack>
      )}
    </VStack>
  );
}
