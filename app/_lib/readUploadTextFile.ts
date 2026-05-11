import { decodeBufferWithEncodingHeuristic } from "./textEncodingHeuristic";

export { decodeBufferWithEncodingHeuristic as decodeTextWithBestEncoding } from "./textEncodingHeuristic";
export { repairLatin1MisinterpretedUtf8, repairStoredKoreanLabel } from "./textEncodingHeuristic";

export function readUploadTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        resolve("");
        return;
      }
      resolve(decodeBufferWithEncodingHeuristic(result));
    };
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsArrayBuffer(file);
  });
}
