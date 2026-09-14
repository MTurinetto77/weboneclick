/** Stopwords ES: solo se filtran de la query, no de los títulos. */
const QUERY_STOPWORDS = new Set([
  "de",
  "para",
  "con",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "y",
  "o",
]);

const MIN_TOKEN_LEN = 2;

/**
 * Normaliza y parte `q` en tokens útiles para matching multi-palabra.
 * Descarta stopwords y tokens de 1 carácter (pero conserva "17", etc.).
 */
export function tokenizeSearchQuery(q: string): string[] {
  const normalized = q
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const part of normalized.split(" ")) {
    if (part.length < MIN_TOKEN_LEN) continue;
    if (QUERY_STOPWORDS.has(part)) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    tokens.push(part);
  }
  return tokens;
}

/**
 * Score de relevancia textual (mayor = mejor).
 * 1) frase completa en el título
 * 2) tokens presentes + bonus si el título empieza con el primer token
 * 3) títulos más cortos ligeramente preferidos
 */
export function scoreTitleRelevance(
  titulo: string,
  q: string,
  tokens: string[]
): number {
  const titleLower = titulo.toLowerCase();
  const qNorm = q.trim().toLowerCase().replace(/\s+/g, " ");

  let score = 0;

  if (qNorm && titleLower.includes(qNorm)) {
    score += 1000;
  }

  if (tokens.length) {
    let hits = 0;
    for (const t of tokens) {
      if (titleLower.includes(t)) hits += 1;
    }
    score += hits * 100;

    const first = tokens[0];
    if (first && titleLower.startsWith(first)) {
      score += 50;
    }
  }

  // Menos ruido: títulos cortos ganan un poco (tope ~30)
  score += Math.max(0, 30 - Math.min(titulo.length, 30));

  return score;
}
