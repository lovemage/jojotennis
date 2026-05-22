"use client";

import { useMemo, useState } from "react";
import type { Court } from "@/data/courts";
import { taiwanCities } from "@/data/cities";
import { useApp } from "@/context/AppContext";
import LoginPromptModal from "@/components/LoginPromptModal";

type CourtsExplorerProps = {
  courts: Court[];
};

const allCitiesLabel = "全部縣市";
const allEnvironmentsLabel = "全部";
const allSurfacesLabel = "全部類型";

export default function CourtsExplorer({ courts = [] }: CourtsExplorerProps) {
  const { user, addCourtReport, courtReports = [] } = useApp();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(allCitiesLabel);
  const [environment, setEnvironment] = useState(allEnvironmentsLabel);
  const [surface, setSurface] = useState(allSurfacesLabel);
  const [lightingOnly, setLightingOnly] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
  const [report, setReport] = useState({
    name: "",
    city: "台北市",
    district: "",
    address: "",
    courtCount: "",
    bookingMethod: "",
    note: "",
  });

  const visibleCourts = useMemo(
    () => [
      ...courts,
      ...courtReports
        .filter((report) => report.status === "approved")
        .map((report) => ({
          id: report.id,
          name: report.name,
          city: report.city,
          district: report.district,
          streetAddress: report.address,
          address: report.address,
          latitude: null,
          longitude: null,
          phone: "",
          weekdayHours: "",
          weekendHours: "",
          courtCount: Number(report.courtCount) || null,
          surface: "待補充",
          environment: "待補充",
          hasLighting: false,
          ownership: "會員回報",
          offPeakRate: null,
          peakRate: null,
          bookingMethod: report.bookingMethod,
          bookingUrl: "",
          bookingStatus: "unknown" as const,
          notes: report.note,
        })),
    ],
    [courtReports, courts],
  );

  const filteredCourts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visibleCourts.filter((court) => {
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
  }, [city, environment, lightingOnly, query, surface, visibleCourts]);

  function openReportForm() {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    setIsReportOpen(true);
    setReportStatus("");
  }

  function updateReport(field: keyof typeof report, value: string) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addCourtReport(report);
    setReport({
      name: "",
      city: "台北市",
      district: "",
      address: "",
      courtCount: "",
      bookingMethod: "",
      note: "",
    });
    setReportStatus("已收到你的球場回報，管理員審核後會更新資料。");
    setIsReportOpen(false);
  }

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

      <div className="mt-4 rounded-[1.5rem] bg-parchment p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-pine">找不到球場？</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              回報新增或修正球場資訊，審核後會加入資料庫。
            </p>
          </div>
          <button
            type="button"
            onClick={openReportForm}
            className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-bold text-white"
          >
            回報球場
          </button>
        </div>
        {reportStatus ? (
          <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-pine">
            {reportStatus}
          </p>
        ) : null}
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
              {court.ownership && court.ownership !== "—" ? (
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                  {court.ownership}
                </span>
              ) : null}
              {court.environment ? (
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                  {court.environment}
                </span>
              ) : null}
              {court.surface ? (
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                  {court.surface}
                </span>
              ) : null}
              {court.courtCount != null ? (
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                  {court.courtCount} 面
                </span>
              ) : null}
              {court.hasLighting ? (
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-pine">
                  夜間照明
                </span>
              ) : null}
            </div>

            <div className="mt-4 border-t border-parchment pt-4 text-sm leading-6 text-muted">
              {court.weekdayHours ? <p>開放時間：{court.weekdayHours}</p> : null}
              {court.bookingMethod ? <p>預約方式：{court.bookingMethod}</p> : null}
              {court.phone ? <p>電話：{court.phone}</p> : null}
              {court.notes ? <p>備註：{court.notes}</p> : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {court.latitude != null && court.longitude != null && court.latitude !== 0 ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${court.latitude},${court.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center rounded-lg bg-clay text-sm font-bold text-white"
                >
                  📍 查看地圖
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-11 cursor-not-allowed items-center justify-center rounded-lg bg-parchment text-sm font-bold text-muted"
                >
                  📍 查看地圖
                </button>
              )}
              {court.bookingUrl.startsWith("http") ? (
                <a
                  href={court.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center rounded-lg border border-pine text-sm font-bold text-pine"
                >
                  📅 前往預約
                </a>
              ) : court.phone ? (
                <a
                  href={`tel:${court.phone}`}
                  className="flex h-11 items-center justify-center rounded-lg border border-pine text-sm font-bold text-pine"
                >
                  📞 撥打預約
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-11 cursor-not-allowed items-center justify-center rounded-lg border border-parchment text-sm font-bold text-muted"
                >
                  📅 前往預約
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {isReportOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/40" onClick={() => setIsReportOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] max-w-md overflow-y-auto rounded-t-[2rem] bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsReportOpen(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-sm font-bold text-muted"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-pine">回報新增球場</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              請提供你知道的球場資訊，管理員審核後會公開。
            </p>
            <form onSubmit={submitReport} className="mt-5 space-y-4">
              <input
                required
                value={report.name}
                onChange={(event) => updateReport("name", event.target.value)}
                placeholder="球場名稱"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <select
                value={report.city}
                onChange={(event) => updateReport("city", event.target.value)}
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              >
                {taiwanCities.map((cityOption) => (
                  <option key={cityOption}>{cityOption}</option>
                ))}
              </select>
              <input
                value={report.district}
                onChange={(event) => updateReport("district", event.target.value)}
                placeholder="行政區，例如：大安區"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <input
                required
                value={report.address}
                onChange={(event) => updateReport("address", event.target.value)}
                placeholder="地址"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <input
                value={report.courtCount}
                onChange={(event) => updateReport("courtCount", event.target.value)}
                placeholder="場地數，例如：4 面"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <input
                value={report.bookingMethod}
                onChange={(event) => updateReport("bookingMethod", event.target.value)}
                placeholder="預約方式，例如：現場登記、電話預約、網站預約"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <textarea
                value={report.note}
                onChange={(event) => updateReport("note", event.target.value.slice(0, 200))}
                rows={4}
                placeholder="補充資訊，例如費用、開放時間、照明、是否室內..."
                className="w-full resize-none rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm leading-6 outline-none focus:border-clay"
              />
              <p className="text-xs leading-5 text-muted">
                送出後會進入管理員審核，不會立即公開。
              </p>
              <button
                type="submit"
                className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
              >
                送出球場回報
              </button>
            </form>
          </div>
        </div>
      ) : null}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </div>
  );
}
