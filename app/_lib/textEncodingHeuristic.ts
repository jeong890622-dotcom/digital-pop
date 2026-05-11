/**
 * 한글 CSV·저장 문자열의 인코딩 추정 및 일반적인 UTF-8→Latin1 깨짐 복구.
 */

/** 복사·엑셀·PDF 등에서 섞이기 쉬운 보이지 않는 문자 제거(복구 판별 방해 방지) */
function normalizeCopyPasteArtifacts(text: string): string {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function scoreKoreanTextQuality(text: string): number {
  let score = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0xfffd) {
      score -= 100;
    } else if (c >= 0xac00 && c <= 0xd7a3) {
      score += 4;
    } else if ((c >= 0x3130 && c <= 0x318f) || (c >= 0x1100 && c <= 0x11ff)) {
      score += 2;
    } else if (c <= 0x7f) {
      score += 0;
    } else if (c <= 0xff) {
      score -= 1;
    }
  }
  return score;
}

function tryDecodeLabel(buffer: ArrayBuffer, label: string): string | null {
  try {
    const dec = new TextDecoder(label, { fatal: false });
    return dec.decode(buffer);
  } catch {
    return null;
  }
}

const DECODER_TRY_ORDER = [
  "utf-8",
  "windows-949",
  "euc-kr",
  "cp949",
  "ks_c_5601-1987",
] as const;

/**
 * UTF-8 바이트열이 한 바이트씩 Latin-1 문자로 잘몼 읽힌 경우(코드포인트 전부 ≤255) UTF-8로 되돌린다.
 * BOM·제로폭 문자 등은 먼저 제거한다.
 */
export function repairLatin1MisinterpretedUtf8(text: string): string {
  const cleaned = normalizeCopyPasteArtifacts(text);
  if (!cleaned) {
    return "";
  }

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned.charCodeAt(i) > 255) {
      return cleaned;
    }
  }

  const bytes = new Uint8Array(cleaned.length);
  for (let i = 0; i < cleaned.length; i++) {
    bytes[i] = cleaned.charCodeAt(i);
  }
  const recovered = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const before = scoreKoreanTextQuality(cleaned);
  const after = scoreKoreanTextQuality(recovered);
  if (after > before + 2) {
    return recovered.trim();
  }
  return cleaned;
}

/**
 * localStorage 등에 저장된 라벨용: 보이지 않는 문자 제거 + Latin1 UTF-8 깨짐 복구를 최대 2회 반복.
 */
export function repairStoredKoreanLabel(text: string): string {
  let prev = text;
  for (let pass = 0; pass < 2; pass++) {
    const next = repairLatin1MisinterpretedUtf8(prev);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

function pickBetterDecodedString(a: string, b: string): string {
  const scoreA = scoreKoreanTextQuality(a);
  const scoreB = scoreKoreanTextQuality(b);
  if (scoreB > scoreA) return b;
  return a;
}

/**
 * ArrayBuffer를 여러 레이블로 디코딩해 한글 품질 점수가 가장 좋은 결과를 고른다.
 */
export function decodeBufferWithEncodingHeuristic(buffer: ArrayBuffer): string {
  let best = "";
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestRank = Number.MAX_SAFE_INTEGER;

  DECODER_TRY_ORDER.forEach((label, index) => {
    const raw = tryDecodeLabel(buffer, label);
    if (raw === null) return;

    const repaired = repairLatin1MisinterpretedUtf8(raw);
    const candidate = pickBetterDecodedString(raw, repaired);
    const score = scoreKoreanTextQuality(candidate);

    if (
      score > bestScore ||
      (score === bestScore && index < bestRank)
    ) {
      bestScore = score;
      best = candidate;
      bestRank = index;
    }
  });

  if (!best) {
    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  }

  return repairLatin1MisinterpretedUtf8(best);
}
