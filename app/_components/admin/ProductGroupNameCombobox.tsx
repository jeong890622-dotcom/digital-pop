"use client";

import { useEffect, useMemo, useState } from "react";

export type ProductGroupNameComboboxProps = {
  id: string;
  /** 선택된 상품군명 (빈 문자열이면 미선택) */
  value: string;
  /** 검색·선택 후보 (중복 없이 정렬된 목록 권장) */
  options: readonly string[];
  onChange: (nextGroupName: string) => void;
  placeholder?: string;
};

/**
 * 등록된 상품군명 문자열 목록에서 검색·키보드로 선택할 때 사용하는 콤보박스.
 */
export function ProductGroupNameCombobox({
  id,
  value,
  options,
  onChange,
  placeholder = "상품군명 검색 후 선택",
}: ProductGroupNameComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [options, query]);

  const pick = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
    setHighlight(-1);
  };

  const selectedTrimmed = value.trim();

  return (
    <div className="relative">
      <input
        id={id}
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          highlight >= 0 && filtered[highlight] ? `${id}-list-opt-${highlight}` : undefined
        }
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          setHighlight(-1);
          if (selectedTrimmed && v.trim() !== selectedTrimmed) {
            onChange("");
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setHighlight(-1);
            if (selectedTrimmed) {
              setQuery(value);
            }
          }, 200);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setHighlight(-1);
            setQuery(value || "");
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) setOpen(true);
            setHighlight((h) => {
              const n = filtered.length;
              if (n === 0) return -1;
              if (h < 0) return 0;
              return Math.min(n - 1, h + 1);
            });
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) setOpen(true);
            setHighlight((h) => {
              const n = filtered.length;
              if (n === 0) return -1;
              if (h <= 0) return 0;
              return h - 1;
            });
            return;
          }
          if (e.key === "Enter") {
            const n = filtered.length;
            if (n === 0) return;
            e.preventDefault();
            const idx =
              highlight >= 0 ? highlight : n === 1 ? 0 : -1;
            const name = idx >= 0 ? filtered[idx] : undefined;
            if (name) pick(name);
          }
        }}
        className="w-full rounded-sm border border-[#E5E5E5] bg-white px-2 py-2 text-sm text-[#111111] placeholder:text-[#888888]"
      />
      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-auto rounded-sm border border-[#E5E5E5] bg-white py-1"
        >
          {options.length === 0 ? (
            <li className="px-2 py-2 text-xs text-[#888888]">표시할 상품군명이 없습니다.</li>
          ) : filtered.length === 0 ? (
            <li className="px-2 py-2 text-xs text-[#888888]">검색 결과가 없습니다.</li>
          ) : (
            filtered.map((name, idx) => (
              <li
                key={name}
                id={`${id}-list-opt-${idx}`}
                role="option"
                aria-selected={selectedTrimmed === name.trim()}
                className={`cursor-pointer px-2 py-1.5 text-sm text-[#111111] ${
                  idx === highlight ? "bg-[#F5F5F5]" : ""
                }`}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pick(name);
                }}
              >
                {name}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
