"use client";

import Link from "next/link";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { useMemo, useState } from "react";
import type { Court } from "@/data/courts";

type CourtsMapProps = {
  courts: Court[];
};

export default function CourtsMap({ courts }: CourtsMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappableCourts = courts.filter(
    (court) => court.latitude != null && court.longitude != null && court.latitude !== 0,
  );
  const selectedCourt = mappableCourts.find((court) => court.id === selectedId) ?? null;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const center = useMemo(() => {
    const first = mappableCourts[0];
    return {
      lat: first?.latitude ?? 23.6978,
      lng: first?.longitude ?? 120.9605,
    };
  }, [mappableCourts]);

  if (!apiKey) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg border border-parchment bg-ivory p-6 text-center text-sm leading-6 text-muted">
        尚未設定 Google Maps API key，填入 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 後會顯示地圖。
      </div>
    );
  }

  if (mappableCourts.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg border border-parchment bg-ivory p-6 text-center text-sm text-muted">
        目前篩選結果沒有可顯示在地圖上的座標。
      </div>
    );
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-lg border border-parchment bg-ivory">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={mappableCourts.length > 1 ? 11 : 15}
          mapId="jojotennis-courts"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {mappableCourts.map((court) => (
            <AdvancedMarker
              key={court.id}
              position={{ lat: court.latitude!, lng: court.longitude! }}
              onClick={() => setSelectedId(court.id)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-clay text-base shadow-lg">
                🎾
              </span>
            </AdvancedMarker>
          ))}
          {selectedCourt ? (
            <InfoWindow
              position={{ lat: selectedCourt.latitude!, lng: selectedCourt.longitude! }}
              onCloseClick={() => setSelectedId(null)}
            >
              <div className="max-w-56 text-sm text-ink">
                <p className="font-bold text-pine">{selectedCourt.name}</p>
                <p className="mt-1 text-xs text-muted">{selectedCourt.address}</p>
                <Link
                  href={`/court/${selectedCourt.id}`}
                  className="mt-3 inline-flex rounded-md bg-pine px-3 py-1.5 text-xs font-bold text-white"
                >
                  查看詳情
                </Link>
              </div>
            </InfoWindow>
          ) : null}
        </Map>
      </APIProvider>
    </div>
  );
}
