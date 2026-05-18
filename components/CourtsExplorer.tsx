"use client";

import { useMemo, useState } from "react";
import type { Court } from "@/data/courts";
import { taiwanCities } from "@/data/cities";

type CourtsExplorerProps = {
  courts: Court[];
};

const allCitiesLabel = "全部縣市";
const allEnvironmentsLabel = "全部";
const allSurfacesLabel = "全部類型";

export default function CourtsExplorer({ courts }: CourtsExplorerProps) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(allCitiesLabel);
  const [environment, setEnvironment] = useState(allEnvironmentsLabel);
  const [surface, setSurface] = useState(allSurfacesLabel);
  const [lightingOnly, setLightingOnly] = useState(false);

  const filteredCourts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courts.filter((court) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          court.name,
          court.city,
          court.district,
          court.address,
          court.surface,
          court.bookingMethod,
          court.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesCity = city === allCitiesLabel || court.city === city;
      const matchesEnvironment =
        environment === allEnvironmentsLabel ||
        court.environment.includes(environment);
      const matchesSurface =
        surface === allSurfacesLabel || court.surface.includes(surface);
      const matchesLighting = !lightingOnly || court.hasLighting;

      return (
        matchesQuery &&
        matchesCity &&
        matchesEnvironment &&
        matchesSurface &&
        matchesLighting
      );
    });
  }, [city, courts, environment, lightingOnly, query, surface]);

  return (
    <div className="mt-6">
      <div className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-clay">搜尋與篩選</p>
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-muted">關鍵字</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋球場、城市、行政區、預約方式"
            className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-clay"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <span className="text-xs font-semibold text-muted">縣市</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
            >
              {[allCitiesLabel, ...taiwanCities].map((cityOption) => (
                <option key={cityOption}>{cityOption}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-semibold text-muted">室內/室外</span>
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
            >
              <option>{allEnvironmentsLabel}</option>
              <option>室內</option>
              <option>室外</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-muted">場地類型</span>
          <select
            value={surface}
            onChange={(event) => setSurface(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-parchment bg-ivory px-3 py-3 text-sm text-ink outline-none focus:border-clay"
          >
            <option>{allSurfacesLabel}</option>
            <option>硬地</option>
            <option>紅土</option>
            <option>草地</option>
          </select>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLightingOnly((value) => !value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              lightingOnly ? "bg-pine text-white" : "bg-ivory text-pine"
            }`}
          >
            夜間照明
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">
          找到{" "}
          <span className="font-bold text-pine">{filteredCourts.length}</span>{" "}
          筆符合條件的球場
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {filteredCourts.map((court) => (
          <article
            key={court.id}
            className="rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold text-clay">
                {court.city} · {court.district}
              </p>
              <h2 className="mt-1 text-lg font-bold text-pine">
                {court.name}
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted">{court.address}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                {court.ownership}
              </span>
              <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                {court.environment}
              </span>
              <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                {court.surface.includes("硬地") ? "硬地" : court.surface}
              </span>
              <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                {court.courtCount ?? "-"} 面
              </span>
              {court.hasLighting ? (
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                  夜間照明
                </span>
              ) : null}
            </div>

            <div className="mt-4 border-t border-parchment pt-4 text-sm leading-6 text-muted">
              <p>開放時間：平日 {court.weekdayHours}</p>
              <p>預約方式：{court.bookingMethod || "待確認"}</p>
              <p>電話：{court.phone || "待確認"}</p>
              {court.offPeakRate !== null || court.peakRate !== null ? (
                <p>
                  費用：離峰 {court.offPeakRate ?? "-"} / 尖峰{" "}
                  {court.peakRate ?? "-"} 元/小時
                </p>
              ) : null}
              {court.bookingUrl.startsWith("http") ? (
                <p>預約資訊：官方網站</p>
              ) : court.bookingUrl ? (
                <p>預約資訊：{court.bookingUrl}</p>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={
                  court.latitude !== null && court.longitude !== null
                    ? `https://www.google.com/maps/search/?api=1&query=${court.latitude},${court.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.address)}`
                }
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center rounded-lg bg-clay text-sm font-bold text-white"
              >
                📍 查看地圖
              </a>
              <a
                href={
                  court.bookingUrl.startsWith("http")
                    ? court.bookingUrl
                    : `tel:${court.phone}`
                }
                target={court.bookingUrl.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex h-11 items-center justify-center rounded-lg border border-pine text-sm font-bold text-pine"
              >
                📅 前往預約
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
