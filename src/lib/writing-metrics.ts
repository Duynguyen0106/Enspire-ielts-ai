export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function avgSentenceLength(text: string): number {
  const sentences = sentenceCount(text);
  if (sentences === 0) return 0;
  return Math.round((wordCount(text) / sentences) * 10) / 10;
}

export function lexicalDiversity(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 0;
  const unique = new Set(words);
  return Math.round((unique.size / words.length) * 100) / 100;
}

export function writingMetrics(text: string) {
  return {
    wordCount: wordCount(text),
    sentenceCount: sentenceCount(text),
    avgSentenceLength: avgSentenceLength(text),
    lexicalDiversity: lexicalDiversity(text),
  };
}
