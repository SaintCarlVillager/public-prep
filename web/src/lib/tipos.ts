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

/** Regras da prova objetiva no edital (como se calcula a nota e quanto tempo dura). */
export interface Objetiva {
  formato?: string;
  questoes?: number;
  /** Nota máxima de cada bloco e da objetiva (10). */
  escala?: number;
  pesos_iguais?: boolean;
  /** Fração mínima da nota no conjunto (0.5 = nota 5 de 10). */
  minimo_total?: number;
  /** Nota final = média ponderada das notas dos blocos (pesos em `blocos[].peso`). */
  media_ponderada?: boolean;
  /** Média mínima para habilitar (na escala da objetiva). */
  minimo_media?: number;
  minimo_media_cotas?: number;
  /** A regra em texto, como o edital a descreve. */
  nota?: string;
  /** Duração oficial da prova, em minutos. */
  duracao_min?: number;
  /** O que essa duração inclui (redação, discursiva), com o item do edital. */
  duracao_inclui?: string;
}

export interface Edital {
  id: string;
  orgao?: string;
  cargo?: string;
  /** Rótulo curto do cargo ("Escrevente"); o app mostra "<órgão> <cargo_curto>". */
  cargo_curto?: string;
  banca?: string;
  prova?: string;
  /** Edital ainda não publicado, modelado pelo anterior: diz o que é estimado. Fica fora dos ativos por padrão. */
  provisorio?: string;
  /** Texto sobre a data da prova quando ela é estimada. */
  prova_prevista?: string;
  objetiva?: Objetiva;
  blocos?: Bloco[];
}

/** Bloco do caderno de uma prova (prova.json): "questoes" é a faixa de números, "1-20". */
export interface BlocoProva {
  id: string;
  nome: string;
  questoes: string;
  materias?: Record<string, string>;
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
  blocos?: BlocoProva[];
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
  /** Normas com lei seca publicada (leis/<SIGLA>.json). */
  leis?: Record<string, { artigos: number; consultado?: string; fonte?: string }>;
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

/** Lei seca: texto oficial de uma norma, artigo por artigo (leis/<SIGLA>.json). */
export interface ArtigoLei {
  /** Número no formato dos dispositivos: "246", "396-A". */
  art: string;
  /** Títulos e capítulos em que o artigo está ("Livro I › Título II"). */
  local?: string;
  /** Texto vigente e literal, uma linha por dispositivo. */
  texto: string;
}
export interface Lei {
  sigla: string;
  nome: string;
  fonte: string;
  consultado: string;
  observacao?: string;
  artigos: ArtigoLei[];
}
