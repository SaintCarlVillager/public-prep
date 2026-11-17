// Formatos dos arquivos gerados por scripts/empacotar.py (web/public/dados/).

export type Letra = "A" | "B" | "C" | "D" | "E";

export interface Cobertura {
  materia: string;
  rotulo?: string;
  questoes?: number;
  temas?: string[];
  normas?: Record<string, string[]>;
}

export interface Bloco {
  id: string;
  nome: string;
  questoes: number;
  peso?: number;
  minimo?: number | null;
  eliminatorio?: boolean;
  cobertura?: Cobertura[];
}

export interface Edital {
  id: string;
  orgao?: string;
  cargo?: string;
  banca?: string;
  prova?: string;
  blocos?: Bloco[];
}

export interface ResumoProva {
  id: string;
  banca: string;
  orgao: string;
  cargo: string;
  ano: number;
  aplicacao?: string;
  questoes: number;
  anuladas: number[];
  gabarito_status?: string;
  arquivo: string;
}

/** Índice leve de cada questão, no catálogo. */
export interface IndiceQuestao {
  id: string;
  n: number | string;
  tipo: "me" | "ce" | "disc" | string;
  temas: string[];
  disp: string[];
  tx?: string;
  anulada?: boolean;
  desat?: boolean;
  img?: number;
  max?: number;
  vf?: string[];
  /** Acrescentado no cliente. */
  prova: string;
}

export interface Catalogo {
  gerado: string;
  materias: Record<string, string>;
  temas: Record<string, string>;
  normas: Record<string, string>;
  editais: Edital[];
  provas: ResumoProva[];
  indice: Record<string, Omit<IndiceQuestao, "prova">[]>;
}

export interface TextoBase {
  titulo?: string;
  texto: string;
  fonte?: string;
}

export interface Questao {
  id: string;
  tipo: string;
  numero: number | string;
  texto?: string;
  enunciado: string;
  alt?: Record<string, string>;
  gab?: string;
  temas?: string[];
  dispositivos?: string[];
  exp?: string;
  exp_alt?: Record<string, string>;
  vf?: Record<string, boolean | null>;
  imagens?: string[];
  anulada?: boolean;
  desatualizada?: string;
  observacoes?: string[];
  prova: string;
  banca?: string;
  ano?: number;
}

export interface ArquivoProva {
  prova: Record<string, unknown>;
  textos: Record<string, TextoBase>;
  questoes: Questao[];
}
