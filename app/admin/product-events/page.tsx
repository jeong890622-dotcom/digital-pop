"use client";

import { useMemo, useState } from "react";
import { useProductEventRules } from "../../_lib/productEventStore";
import type { ProductEventRules } from "../../_types/productBadge";

type EventKey = keyof ProductEventRules;

const EVENT_SECTIONS: Array<{ key: EventKey; title: string; helper: string }> = [
  { key: "bestProductCodes", title: "BEST 상품 등록하기", helper: "BEST 배지 노출 대상 제품코드" },
  { key: "wallRequiredProductCodes", title: "벽고정 제품 등록하기", helper: "벽 고정 필요 배지 노출 대상 제품코드" },
  { key: "newProductCodes", title: "신제품 등록하기", helper: "NEW 배지 노출 대상 제품코드" },
];

export default function ProductEventsPage() {
  const [rules, setRules] = useProductEventRules();
  const [draftByKey, setDraftByKey] = useState<Record<EventKey, string>>({
    bestProductCodes: "",
    wallRequiredProductCodes: "",
    newProductCodes: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const normalizedRules = useMemo(
    () => ({
      bestProductCodes: [...rules.bestProductCodes].sort((a, b) => a.localeCompare(b)),
      wallRequiredProductCodes: [...rules.wallRequiredProductCodes].sort((a, b) => a.localeCompare(b)),
      newProductCodes: [...rules.newProductCodes].sort((a, b) => a.localeCompare(b)),
    }),
    [rules],
  );

  const addCode = (key: EventKey) => {
    const code = draftByKey[key].trim();
    if (!code) {
      setMessage("제품코드를 입력해 주세요.");
      return;
    }
    const exists = rules[key].some((item) => item.trim().toLowerCase() === code.toLowerCase());
    if (exists) {
      setMessage("이미 등록된 제품코드입니다.");
      return;
    }
    setRules({
      ...rules,
      [key]: [...rules[key], code],
    });
    setDraftByKey((prev) => ({ ...prev, [key]: "" }));
    setMessage("제품코드를 등록했습니다.");
  };

  const removeCode = (key: EventKey, code: string) => {
    setRules({
      ...rules,
      [key]: rules[key].filter((item) => item !== code),
    });
    setMessage("제품코드를 삭제했습니다.");
  };

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">상품 이벤트 등록</h1>
      <p className="mt-1 text-sm text-[#666666]">
        사용자 카드 가격 아래 배지를 제품코드 기준으로 등록/삭제합니다.
      </p>
      <p className="mt-1 text-xs text-[#888888]">
        배지 표시 순서: 벽 고정 필요 &gt; NEW &gt; BEST
      </p>

      <div className="mt-5 space-y-4">
        {EVENT_SECTIONS.map((section) => (
          <section key={section.key} className="rounded-sm border border-[#E5E5E5] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-[#111111]">{section.title}</h2>
                <p className="mt-1 text-xs text-[#888888]">{section.helper}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={draftByKey[section.key]}
                  onChange={(e) =>
                    setDraftByKey((prev) => ({ ...prev, [section.key]: e.target.value }))
                  }
                  placeholder="제품코드 입력"
                  className="rounded-sm border border-[#E5E5E5] px-2 py-1.5 text-sm text-[#111111]"
                />
                <button
                  type="button"
                  onClick={() => addCode(section.key)}
                  className="rounded-sm bg-[#111111] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  추가
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-sm border border-[#E5E5E5]">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                    <th className="px-3 py-2 text-xs font-medium text-[#666666]">제품코드</th>
                    <th className="px-3 py-2 text-xs font-medium text-[#666666]">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedRules[section.key].length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-8 text-center text-xs text-[#888888]">
                        등록된 제품코드가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    normalizedRules[section.key].map((code) => (
                      <tr key={code} className="border-b border-[#E5E5E5] last:border-b-0">
                        <td className="px-3 py-2 text-sm text-[#111111]">{code}</td>
                        <td className="px-3 py-2 text-xs">
                          <button
                            type="button"
                            onClick={() => removeCode(section.key, code)}
                            className="text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {message ? <p className="mt-4 text-xs text-[#111111]">{message}</p> : null}
    </section>
  );
}
