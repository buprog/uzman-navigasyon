/**
 * Portable JSON shape for a tour (+stops).
 * Designed for future: encrypted Google Drive backup / restore, and mobile sync.
 * No Drive or mobile implementation in v1.
 */
export type TourExportV1 = {
  schemaVersion: 1;
  exportedAt: string;
  tour: {
    name: string;
    description: string;
    startName: string;
    endName: string;
    startDate: string | null;
    endDate: string | null;
    dayCount: number;
    stops: Array<{
      dayIndex: number;
      order: number;
      type: string;
      name: string;
      durationMin: number;
      note: string;
      lat: number;
      lng: number;
      address: string;
      skipped: boolean;
    }>;
  };
};

type TourWithStops = {
  name: string;
  description: string;
  startName: string;
  endName: string;
  startDate: string | null;
  endDate: string | null;
  dayCount: number;
  stops: Array<{
    dayIndex: number;
    order: number;
    type: string;
    name: string;
    durationMin: number;
    note: string;
    lat: number;
    lng: number;
    address: string;
    skipped: boolean;
  }>;
};

export function toTourExport(tour: TourWithStops): TourExportV1 {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tour: {
      name: tour.name,
      description: tour.description,
      startName: tour.startName,
      endName: tour.endName,
      startDate: tour.startDate,
      endDate: tour.endDate,
      dayCount: tour.dayCount,
      stops: tour.stops
        .slice()
        .sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order)
        .map((s) => ({
          dayIndex: s.dayIndex,
          order: s.order,
          type: s.type,
          name: s.name,
          durationMin: s.durationMin,
          note: s.note,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          skipped: s.skipped,
        })),
    },
  };
}
