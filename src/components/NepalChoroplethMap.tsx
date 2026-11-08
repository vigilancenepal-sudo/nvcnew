import React, { useMemo, useState, useRef } from 'react';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import nepalGeoJsonRaw from '../data/nepal77Districts.json';
import { DISTRICT_NE_MAP, toNepaliDigits } from '../data/nvcStructure';
import { MapPin, RotateCcw } from 'lucide-react';

interface NepalChoroplethMapProps {
  districtCounts: Record<string, number>;
  selectedDistrict: string | null;
  onSelectDistrict: (districtEn: string | null) => void;
  title?: string;
  subtitle?: string;
  entityLabel?: string;
  entityPlural?: string;
  emptyMessage?: string;
}

interface GeoFeature {
  type: 'Feature';
  properties: {
    DIST_EN: string;
    DIST_PCODE: string;
    ADM1_EN: string;
  };
  geometry: any;
}

interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

const PROVINCE_NAMES_NE: Record<string, string> = {
  '1': 'कोशी प्रदेश',
  '2': 'मधेश प्रदेश',
  '3': 'बागमती प्रदेश',
  '4': 'गण्डकी प्रदेश',
  '5': 'लुम्बिनी प्रदेश',
  '6': 'कर्णाली प्रदेश',
  '7': 'सुदूरपश्चिम प्रदेश',
};

function getFillColor(count: number, maxCount: number, isSelected: boolean): string {
  if (isSelected) return '#b91c1c'; // Sovereign crimson highlight for selected district
  if (count === 0) return '#f8fafc';
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio <= 0.2) return '#dbeafe';
  if (ratio <= 0.45) return '#93c5fd';
  if (ratio <= 0.7) return '#3b82f6';
  return '#1e3a8a';
}

function rewindGeometry(geom: any): any {
  if (!geom || !geom.coordinates) return geom;
  if (geom.type === 'Polygon') {
    return {
      ...geom,
      coordinates: geom.coordinates.map((ring: any[]) => ring.slice().reverse()),
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly: any[][]) =>
        poly.map((ring: any[]) => ring.slice().reverse())
      ),
    };
  }
  return geom;
}

export const NepalChoroplethMap: React.FC<NepalChoroplethMapProps> = ({
  districtCounts,
  selectedDistrict,
  onSelectDistrict,
  title = 'जिल्लागत उजुरी वितरण नक्सा',
  subtitle = 'जिल्लामा क्लिक गरी विवरण फिल्टर गर्नुहोस्',
  entityLabel = 'उजुरी',
  entityPlural = 'उजुरी',
  emptyMessage = 'कुनै उजुरी दर्ता भएको छैन।',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<{
    en: string;
    ne: string;
    province: string;
    count: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const geoData = nepalGeoJsonRaw as unknown as GeoCollection;

  const { paths, maxCount, topDistricts } = useMemo(() => {
    const width = 760;
    const height = 400;

    // Ensure all features have counter-clockwise outer rings (area <= 2*PI steradians)
    const sanitizedFeatures = geoData.features.map((feature) => {
      try {
        const area = geoArea(feature as any);
        if (area > 2 * Math.PI) {
          return {
            ...feature,
            geometry: rewindGeometry(feature.geometry),
          };
        }
      } catch {
        // keep feature if calculation fails
      }
      return feature;
    });

    const sanitizedCollection = {
      type: 'FeatureCollection',
      features: sanitizedFeatures,
    };

    const projection = geoMercator().fitExtent(
      [
        [18, 18],
        [width - 18, height - 18],
      ],
      sanitizedCollection as any
    );
    const pathGenerator = geoPath().projection(projection);

    let max = 0;
    Object.values(districtCounts).forEach((val) => {
      if (val > max) max = val;
    });

    const computedPaths = sanitizedFeatures.map((feature) => {
      const distEn = feature.properties.DIST_EN;
      const d = pathGenerator(feature as any) || '';
      const centroid = pathGenerator.centroid(feature as any);
      return {
        distEn,
        distNe: DISTRICT_NE_MAP[distEn] || distEn,
        provinceCode: feature.properties.ADM1_EN,
        d,
        centroid,
      };
    });

    const sorted = Object.entries(districtCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([en, count]) => ({
        en,
        ne: DISTRICT_NE_MAP[en] || en,
        count,
      }));

    return { paths: computedPaths, maxCount: max, topDistricts: sorted };
  }, [geoData, districtCounts]);

  const activeInfo = hoveredDistrict || (selectedDistrict
    ? {
      en: selectedDistrict,
      ne: DISTRICT_NE_MAP[selectedDistrict] || selectedDistrict,
      province:
        PROVINCE_NAMES_NE[
        paths.find((p) => p.distEn === selectedDistrict || p.distNe === selectedDistrict)?.provinceCode || ''
        ] || '',
      count:
        districtCounts[selectedDistrict] ||
        districtCounts[DISTRICT_NE_MAP[selectedDistrict] || ''] ||
        0,
    }
    : null);

  const hoveredPathItem = hoveredDistrict
    ? paths.find((p) => p.distEn === hoveredDistrict.en)
    : null;
  const selectedPathItem = selectedDistrict
    ? paths.find((p) => p.distEn === selectedDistrict || p.distNe === selectedDistrict)
    : null;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between border border-slate-200/90 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {selectedDistrict && (
            <button
              type="button"
              onClick={() => onSelectDistrict(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              सबै जिल्ला ({DISTRICT_NE_MAP[selectedDistrict] || selectedDistrict} हटाउनुहोस्)
            </button>
          )}

          {activeInfo ? (
            <div className="text-right text-xs">
              <span className="font-semibold text-slate-900">{activeInfo.ne}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="text-slate-500">{activeInfo.province}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-semibold text-blue-900 tabular-nums">
                {toNepaliDigits(activeInfo.count)} {entityLabel}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              नक्सामा माउस लैजानुहोस् वा क्लिक गर्नुहोस्
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center pt-3">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredDistrict(null);
            setMousePos(null);
          }}
          className="xl:col-span-9 relative bg-slate-50/80 border border-slate-200 rounded-lg overflow-hidden min-h-[300px]"
        >
          {/* Floating Tooltip */}
          {hoveredDistrict && mousePos && (
            <div
              className="pointer-events-none absolute z-30 px-3 py-1.5 rounded-lg bg-slate-900/95 text-white text-xs shadow-xl backdrop-blur-xs border border-slate-700 transform -translate-x-1/2 -translate-y-full transition-all duration-75"
              style={{ left: Math.max(70, Math.min(mousePos.x, (containerRef.current?.clientWidth || 700) - 70)), top: Math.max(40, mousePos.y - 12) }}
            >
              <div className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
                <span>{hoveredDistrict.ne}</span>
                <span className="text-slate-400 font-normal text-[11px]">({hoveredDistrict.en})</span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-between gap-3 mt-0.5 whitespace-nowrap">
                <span>{hoveredDistrict.province}</span>
                <span className="font-semibold text-blue-300">
                  {toNepaliDigits(hoveredDistrict.count)} {entityLabel}
                </span>
              </div>
            </div>
          )}

          <svg
            viewBox="0 0 760 400"
            className="w-full h-auto max-h-[380px] select-none block"
            role="img"
            aria-label={`नेपालको ७७ जिल्लाको ${entityPlural} नक्सा`}
          >
            {/* Base Districts */}
            <g>
              {paths.map((item) => {
                const count =
                  districtCounts[item.distEn] ||
                  districtCounts[item.distNe] ||
                  (item.distEn.toUpperCase() in districtCounts ? districtCounts[item.distEn.toUpperCase()] : 0) ||
                  0;
                const isSelected = selectedDistrict === item.distEn || selectedDistrict === item.distNe;
                const fill = getFillColor(count, maxCount, isSelected);

                return (
                  <path
                    key={item.distEn}
                    d={item.d}
                    fill={fill}
                    stroke="#94a3b8"
                    strokeWidth={0.65}
                    className="transition-colors duration-150 cursor-pointer hover:brightness-95"
                    onMouseEnter={() =>
                      setHoveredDistrict({
                        en: item.distEn,
                        ne: item.distNe,
                        province: PROVINCE_NAMES_NE[item.provinceCode] || '',
                        count,
                      })
                    }
                    onClick={() =>
                      onSelectDistrict(isSelected ? null : item.distEn)
                    }
                  >
                    <title>
                      {item.distNe} ({item.distEn}): {toNepaliDigits(count)} {entityLabel}
                    </title>
                  </path>
                );
              })}
            </g>

            {/* Selected District Highlight Overlay (drawn on top to prevent stroke clipping) */}
            {selectedPathItem && (
              <path
                d={selectedPathItem.d}
                fill="#b91c1c"
                stroke="#7f1d1d"
                strokeWidth={2}
                className="pointer-events-none drop-shadow-sm"
              />
            )}

            {/* Hovered District Highlight Overlay (drawn on top) */}
            {hoveredPathItem && hoveredPathItem.distEn !== selectedPathItem?.distEn && (
              <path
                d={hoveredPathItem.d}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth={1.8}
                className="pointer-events-none"
              />
            )}
          </svg>

          {/* Choropleth Legend */}
          <div className="px-4 py-2.5 bg-white/95 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-700">{entityLabel} घनत्व:</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-[#f8fafc] border border-slate-300" />
                ०
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-[#dbeafe]" />
                न्यून
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-[#93c5fd]" />
                मध्यम
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-[#3b82f6]" />
                उच्च
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-[#1e3a8a]" />
                अति उच्च ({toNepaliDigits(maxCount)})
              </span>
            </div>
            <div className="text-slate-500 tabular-nums">
              सक्रिय जिल्लाहरू: {toNepaliDigits(Object.values(districtCounts).filter((c) => c > 0).length)} / ७७
            </div>
          </div>
        </div>

        {/* Right Side Top Districts Summary */}
        <div className="xl:col-span-3 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>अधिक {entityPlural} भएका जिल्लाहरू</span>
              <span className="text-slate-400">संख्या</span>
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              {topDistricts.length === 0 ? (
                <p className="py-4 text-xs text-slate-400">{emptyMessage}</p>
              ) : (
                topDistricts.map((d, idx) => {
                  const active = selectedDistrict === d.en;
                  return (
                    <button
                      key={d.en}
                      type="button"
                      onClick={() => onSelectDistrict(active ? null : d.en)}
                      className={`w-full py-2 px-2 flex items-center justify-between text-left text-xs rounded transition-colors cursor-pointer ${active
                        ? 'bg-red-50 text-red-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 font-mono-num w-4">
                          {toNepaliDigits(idx + 1)}.
                        </span>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{d.ne}</span>
                      </span>
                      <span className="font-mono-num font-semibold text-slate-900 shrink-0">
                        {toNepaliDigits(d.count)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            नक्सामा देखाइएका तथ्याङ्क हाल लगइन गरिएको तह र छनौट गरिएको आर्थिक वर्षका {entityPlural} मा आधारित छन्।
          </div>
        </div>
      </div>
    </div>
  );
};
