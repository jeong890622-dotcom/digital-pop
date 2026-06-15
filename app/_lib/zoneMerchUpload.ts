import type { StoreOperationRow } from "./storeOperationStore";

export const ZONE_MERCH_COLUMNS = ["ZONE", "제품코드", "색상"] as const;

export type ZoneMerchUploadMode = "overwrite" | "append" | "modify";

export type ZoneMerchParseFailure = {
  rowLabel: string;
  reason: string;
};

export type ZoneMerchUploadSummary = {
  successCount: number;
  failCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  deletedCount: number;
  replacedZones: string[];
  newZones: string[];
};

export type ZoneMerchUploadPlan = {
  nextRows: StoreOperationRow[];
  summary: ZoneMerchUploadSummary;
  confirmMessage: string | null;
};

function splitUploadLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim());
  }
  return line.split(",").map((cell) => cell.trim());
}

export function normalizeZoneKey(zone: string): string {
  return zone.trim().toLowerCase();
}

function merchRowKey(zone: string, productCode: string, colorCode: string): string {
  return `${normalizeZoneKey(zone)}|${productCode.trim().toLowerCase()}|${colorCode.trim().toLowerCase()}`;
}

function canonicalZoneLabel(
  existingRows: StoreOperationRow[],
  zoneKey: string,
  uploadLabel: string,
): string {
  const existing = existingRows.find((row) => normalizeZoneKey(row.zone) === zoneKey);
  return existing?.zone ?? uploadLabel.trim();
}

export function parseZoneMerchUploadText(
  text: string,
  storeId: string,
  masterKeys?: Set<string>,
): {
  rows: StoreOperationRow[];
  failures: ZoneMerchParseFailure[];
  zonesAttempted: Map<string, string>;
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const failures: ZoneMerchParseFailure[] = [];
  const zonesAttempted = new Map<string, string>();
  const dedup = new Map<string, StoreOperationRow>();

  if (lines.length === 0) {
    return { rows: [], failures, zonesAttempted };
  }

  const firstCells = splitUploadLine(lines[0] ?? "");
  const hasHeader = firstCells[0] === ZONE_MERCH_COLUMNS[0];
  const bodyLines = hasHeader ? lines.slice(1) : lines;

  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i] ?? "";
    const rowLabel = `${i + (hasHeader ? 2 : 1)}행`;
    const cells = splitUploadLine(line);
    if (cells.length !== ZONE_MERCH_COLUMNS.length) {
      failures.push({ rowLabel, reason: "컬럼 수가 올바르지 않습니다." });
      continue;
    }

    const zoneLabel = (cells[0] ?? "").trim();
    const productCode = (cells[1] ?? "").trim();
    const colorCode = (cells[2] ?? "").trim();

    if (zoneLabel) {
      const zoneKey = normalizeZoneKey(zoneLabel);
      if (!zonesAttempted.has(zoneKey)) {
        zonesAttempted.set(zoneKey, zoneLabel);
      }
    }

    if (!zoneLabel || !productCode || !colorCode) {
      failures.push({ rowLabel, reason: "ZONE, 제품코드, 색상을 모두 입력해 주세요." });
      continue;
    }

    if (masterKeys && !masterKeys.has(`${productCode.toLowerCase()}|${colorCode.toLowerCase()}`)) {
      failures.push({ rowLabel, reason: "상품 마스터에 없는 제품코드·색상 조합입니다." });
      continue;
    }

    const key = merchRowKey(zoneLabel, productCode, colorCode);
    dedup.set(key, {
      storeId,
      zone: zoneLabel,
      productCode,
      colorCode,
      sortOrder: null,
    });
  }

  return { rows: [...dedup.values()], failures, zonesAttempted };
}

function emptyZonesInModify(
  zonesAttempted: Map<string, string>,
  validRows: StoreOperationRow[],
): string[] {
  const validByZone = new Set(validRows.map((row) => normalizeZoneKey(row.zone)));
  const empty: string[] = [];
  for (const [zoneKey, label] of zonesAttempted) {
    if (!validByZone.has(zoneKey)) {
      empty.push(label);
    }
  }
  return empty;
}

export function planZoneMerchUpload(params: {
  mode: ZoneMerchUploadMode;
  storeId: string;
  prevRows: StoreOperationRow[];
  parsedRows: StoreOperationRow[];
  zonesAttempted: Map<string, string>;
}): { ok: true; plan: ZoneMerchUploadPlan } | { ok: false; message: string } {
  const { mode, storeId, prevRows, parsedRows, zonesAttempted } = params;

  if (parsedRows.length === 0 && zonesAttempted.size === 0) {
    return { ok: false, message: "헤더를 제외한 유효한 데이터가 없습니다." };
  }

  if (mode === "modify") {
    const emptyZones = emptyZonesInModify(zonesAttempted, parsedRows);
    if (emptyZones.length > 0) {
      return {
        ok: false,
        message: `수정 업로드는 ZONE마다 최소 1건의 상품이 필요합니다. 상품이 없는 ZONE: ${emptyZones.join(", ")}`,
      };
    }
    if (parsedRows.length === 0) {
      return { ok: false, message: "수정 업로드할 유효한 상품 데이터가 없습니다." };
    }
  } else if (parsedRows.length === 0) {
    return { ok: false, message: "유효한 상품 데이터가 없어 업로드를 진행할 수 없습니다." };
  }

  const prevMap = new Map(
    prevRows.map((row) => [merchRowKey(row.zone, row.productCode, row.colorCode), row]),
  );
  const existingZoneKeys = new Set(prevRows.map((row) => normalizeZoneKey(row.zone)));

  let nextRows: StoreOperationRow[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let deletedCount = 0;
  const replacedZones: string[] = [];
  const newZones: string[] = [];

  if (mode === "overwrite") {
    for (const row of parsedRows) {
      const key = merchRowKey(row.zone, row.productCode, row.colorCode);
      const prev = prevMap.get(key);
      if (prev) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
    }
    deletedCount = prevRows.filter((row) => {
      const key = merchRowKey(row.zone, row.productCode, row.colorCode);
      return !parsedRows.some(
        (parsed) => merchRowKey(parsed.zone, parsed.productCode, parsed.colorCode) === key,
      );
    }).length;

    nextRows = parsedRows.map((row) => {
      const key = merchRowKey(row.zone, row.productCode, row.colorCode);
      const prev = prevMap.get(key);
      const zoneKey = normalizeZoneKey(row.zone);
      return {
        ...row,
        storeId,
        zone: canonicalZoneLabel(prevRows, zoneKey, row.zone),
        sortOrder: prev?.sortOrder ?? null,
      };
    });
  } else if (mode === "append") {
    const nextMap = new Map(
      prevRows.map((row) => [merchRowKey(row.zone, row.productCode, row.colorCode), { ...row }]),
    );

    for (const row of parsedRows) {
      const zoneKey = normalizeZoneKey(row.zone);
      const key = merchRowKey(row.zone, row.productCode, row.colorCode);
      if (nextMap.has(key)) {
        skippedCount += 1;
        continue;
      }
      if (!existingZoneKeys.has(zoneKey)) {
        newZones.push(canonicalZoneLabel(prevRows, zoneKey, row.zone));
        existingZoneKeys.add(zoneKey);
      }
      createdCount += 1;
      nextMap.set(key, {
        ...row,
        storeId,
        zone: canonicalZoneLabel(prevRows, zoneKey, row.zone),
        sortOrder: null,
      });
    }
    nextRows = [...nextMap.values()];
  } else {
    const modifyZoneKeys = new Set(parsedRows.map((row) => normalizeZoneKey(row.zone)));
    for (const zoneKey of modifyZoneKeys) {
      const label =
        prevRows.find((row) => normalizeZoneKey(row.zone) === zoneKey)?.zone ??
        parsedRows.find((row) => normalizeZoneKey(row.zone) === zoneKey)?.zone ??
        zoneKey;
      replacedZones.push(label);
      if (!existingZoneKeys.has(zoneKey)) {
        newZones.push(label);
      }
    }

    const keptRows = prevRows.filter((row) => !modifyZoneKeys.has(normalizeZoneKey(row.zone)));
    deletedCount = prevRows.length - keptRows.length;

    const rowsByZone = new Map<string, StoreOperationRow[]>();
    for (const row of parsedRows) {
      const zoneKey = normalizeZoneKey(row.zone);
      const bucket = rowsByZone.get(zoneKey) ?? [];
      bucket.push(row);
      rowsByZone.set(zoneKey, bucket);
    }

    const replacedRows: StoreOperationRow[] = [];
    for (const [zoneKey, zoneRows] of rowsByZone) {
      zoneRows.forEach((row, index) => {
        const key = merchRowKey(row.zone, row.productCode, row.colorCode);
        if (prevMap.has(key)) {
          updatedCount += 1;
        } else {
          createdCount += 1;
        }
        replacedRows.push({
          ...row,
          storeId,
          zone: canonicalZoneLabel(prevRows, zoneKey, row.zone),
          sortOrder: index,
        });
      });
    }

    nextRows = [...keptRows, ...replacedRows];
  }

  const uniqueNewZones = [...new Set(newZones)];
  const uniqueReplacedZones = [...new Set(replacedZones)];

  const summary: ZoneMerchUploadSummary = {
    successCount:
      mode === "append" ? createdCount : mode === "modify" ? createdCount + updatedCount : nextRows.length,
    failCount: 0,
    createdCount,
    updatedCount,
    skippedCount,
    deletedCount,
    replacedZones: uniqueReplacedZones,
    newZones: uniqueNewZones,
  };

  let confirmMessage: string | null = null;
  if (mode === "overwrite") {
    confirmMessage = `매장 전체 편성 ${prevRows.length}건이 삭제되고 파일 기준 ${parsedRows.length}건으로 교체됩니다. 계속하시겠습니까?`;
  } else if (mode === "modify") {
    confirmMessage = `${uniqueReplacedZones.join(", ")} ZONE의 기존 상품 ${deletedCount}건이 삭제되고 파일 기준으로 교체됩니다. 다른 ZONE은 유지됩니다. 계속하시겠습니까?`;
  }

  return {
    ok: true,
    plan: { nextRows, summary, confirmMessage },
  };
}

export function zoneMerchUploadResultMessage(
  mode: ZoneMerchUploadMode,
  summary: ZoneMerchUploadSummary,
): string {
  if (mode === "overwrite") {
    return "일괄 업로드(전체 덮어쓰기)를 반영했습니다.";
  }
  if (mode === "append") {
    return "추가 업로드를 반영했습니다.";
  }
  return "수정 업로드(존 단위 덮어쓰기)를 반영했습니다.";
}
