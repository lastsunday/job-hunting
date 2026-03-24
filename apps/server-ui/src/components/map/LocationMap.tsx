import { Map, Source, Layer } from '@vis.gl/react-maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Text } from '@mantine/core';
import { useEffect, useRef, useCallback } from 'react';
import classes from './LocationMap.module.css';

export interface MapItem {
  id: string;
  name: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  salary?: { min?: number; max?: number };
  company?: string;
  degree?: string;
  year?: number;
}

function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  const PI = 3.1415926535897932384626;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  const isOutOfChina = (lng: number, lat: number) => {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  };

  const transformLat = (x: number, y: number) => {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y;
    ret += 0.2 * Math.sqrt(Math.abs(x)) * (x > 0 ? 1 : -1);
    ret += ((160.0 + 320.0 * (x > 0 ? 1 : -1)) * Math.abs(x)) / 120.0;
    ret += ((x > 0 ? 1 : -1) * 200.0 * Math.abs(x)) / 150.0;
    return ret;
  };

  const transformLng = (x: number, y: number) => {
    let ret =
      300.0 +
      x +
      2.0 * y +
      0.1 * x * x +
      0.1 * x * y +
      0.1 * Math.sqrt(Math.abs(x));
    ret +=
      (20.0 * (x > 0 ? 1 : -1) * 6.0 * (x > 0 ? 1 : -1) * Math.abs(x)) / 150.0;
    ret += ((30.0 + 30.0 * (x > 0 ? 1 : -1)) * Math.abs(x)) / 120.0;
    return ret;
  };

  if (isOutOfChina(lng, lat)) {
    return [lng, lat];
  }

  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = (lat / 180.0) * PI;
  let magic = Math.sin(radlat);
  magic = 1 - ee * magic * magic;
  const sqrtmagic = Math.sqrt(magic);

  dlat = (dlat * 180.0) / (((a * (1 - ee)) / (magic * sqrtmagic)) * PI);
  dlng = (dlng * 180.0) / ((a / sqrtmagic) * Math.cos(radlat) * PI);

  return [lng + dlng, lat + dlat];
}

export interface LocationMapProps {
  mode: 'single' | 'multi';
  type?: 'job' | 'company';
  longitude?: number;
  latitude?: number;
  name?: string;
  address?: string;
  items?: MapItem[];
  height?: number;
  onItemClick?: (id: string) => void;
  selectedId?: string | null;
  className?: string;
}

export function LocationMap({
  mode,
  type = 'job',
  longitude,
  latitude,
  name,
  address,
  items,
  height,
  onItemClick,
  selectedId,
  className,
}: LocationMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const clusterPopupRef = useRef<maplibregl.Popup | null>(null);

  const validItems =
    items
      ?.filter((item) => item.longitude != null && item.latitude != null)
      .map((item) => {
        const [lng, lat] = wgs84ToGcj02(item.longitude!, item.latitude!);
        return { ...item, longitude: lng, latitude: lat };
      }) ?? [];

  const geojsonData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: validItems.map((item) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [item.longitude!, item.latitude!],
      },
      properties: {
        id: item.id,
        name: item.name,
        address: item.address,
        company: item.company,
        salaryMin: item.salary?.min,
        salaryMax: item.salary?.max,
      },
    })),
  };

  const hasCoordinates =
    mode === 'single'
      ? longitude != null && latitude != null
      : validItems.length > 0;

  if (!hasCoordinates) {
    return (
      <div
        className={`${classes.fallback} ${className || ''}`}
        style={{ height: height ?? '100%' }}
      >
        <Text c="dimmed" size="sm">
          暂无坐标信息
        </Text>
      </div>
    );
  }

  const [centerLng, centerLat] =
    mode === 'single' && longitude != null && latitude != null
      ? wgs84ToGcj02(longitude, latitude)
      : validItems.length > 0
      ? [
          validItems.reduce((sum, i) => sum + (i.longitude ?? 0), 0) /
            validItems.length,
          validItems.reduce((sum, i) => sum + (i.latitude ?? 0), 0) /
            validItems.length,
        ]
      : [116.4, 39.9];

  const createPopupContent = useCallback(
    (item: MapItem, showCoords = false) => {
      const salaryText =
        type === 'job' && item.salary?.min && item.salary?.max
          ? `<div class="${classes.popupSalary}">${item.salary.min / 1000}k-${
              item.salary.max / 1000
            }k</div>`
          : '';
      const companyText = item.company
        ? `<div class="${classes.popupCompany}">${item.company}</div>`
        : '';
      const addressText = item.address
        ? `<div class="${classes.popupAddress}">${item.address}</div>`
        : '';
      const degreeText =
        type === 'job' && item.degree
          ? `<div class="${classes.popupAddress}">${item.degree}</div>`
          : '';
      const yearText =
        type === 'job' && item.year != null
          ? `<div class="${classes.popupAddress}">${item.year}年</div>`
          : '';

      return `
      <div class="${classes.popup}">
        <div class="${classes.popupTitle}">${item.name || '位置'}</div>
        ${companyText}
        ${addressText}
        ${salaryText}
        ${degreeText}
        ${yearText}
        ${
          showCoords
            ? `<div class="${classes.popupCoords}">${item.longitude?.toFixed(
                6
              )}, ${item.latitude?.toFixed(6)}</div>`
            : ''
        }
      </div>
    `;
    },
    [type]
  );

  const fitBounds = useCallback(() => {
    if (!mapRef.current || validItems.length === 0) return;

    const map = mapRef.current;

    if (validItems.length === 1) {
      map.setCenter([validItems[0].longitude!, validItems[0].latitude!]);
      map.setZoom(14);
      return;
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    validItems.forEach((item) => {
      const lng = item.longitude!;
      const lat = item.latitude!;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    const padding = 50;

    if (minLng === maxLng && minLat === maxLat) {
      map.setCenter([minLng, minLat]);
      map.setZoom(14);
    } else {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: padding,
          maxZoom: 14,
          duration: 500,
        }
      );
    }
  }, [validItems]);

  useEffect(() => {
    if (!mapRef.current || mode !== 'multi' || !selectedId) return;

    const map = mapRef.current;
    const item = validItems.find((i) => i.id === selectedId);
    if (item && item.longitude && item.latitude) {
      map.flyTo({
        center: [item.longitude, item.latitude],
        zoom: 15,
        duration: 500,
      });

      if (popupRef.current) {
        popupRef.current.remove();
      }

      popupRef.current = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      })
        .setLngLat([item.longitude, item.latitude])
        .setHTML(createPopupContent(item))
        .addTo(map);
    }
  }, [selectedId, mode, validItems, createPopupContent]);

  useEffect(() => {
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, []);

  const handleMapLoad = useCallback(() => {
    if (mode === 'multi' && validItems.length > 0) {
      const map = mapRef.current;
      if (map) {
        fitBounds();
      }
    }
  }, [mode, validItems.length, fitBounds]);

  return (
    <div
      className={`${classes.container} ${className || ''}`}
      style={{ height: height ?? '100%' }}
    >
      <Map
        mapLib={maplibregl}
        mapStyle={{
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [
                'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
              ],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: 'autonavi',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        }}
        initialViewState={{
          longitude: centerLng,
          latitude: centerLat,
          zoom: mode === 'single' ? 14 : 10,
        }}
        onLoad={(e) => {
          const map = e.target;
          mapRef.current = map;

          if (mode === 'single' && longitude != null && latitude != null) {
            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
              <div class="${classes.popup}">
                <div class="${classes.popupTitle}">${name || '位置'}</div>
                ${
                  address
                    ? `<div class="${classes.popupAddress}">${address}</div>`
                    : ''
                }
                <div class="${classes.popupCoords}">${longitude?.toFixed(
              6
            )}, ${latitude?.toFixed(6)}</div>
              </div>
            `);

            new maplibregl.Marker({ color: '#228be6' })
              .setLngLat([longitude, latitude])
              .setPopup(popup)
              .addTo(map);
          } else if (mode === 'multi') {
            map.on('click', 'clusters', (ev) => {
              if (clusterPopupRef.current) {
                clusterPopupRef.current.remove();
                clusterPopupRef.current = null;
              }

              const features = map.queryRenderedFeatures(ev.point, {
                layers: ['clusters'],
              });
              if (!features.length) return;

              const feature = features[0];
              const clusterId = feature.properties?.cluster_id;
              if (clusterId == null) return;

              const source = map.getSource(
                'locations'
              ) as maplibregl.GeoJSONSource;
              if (!source) return;

              source.getClusterLeaves(clusterId, 10000, 0).then((leaves) => {
                const items: MapItem[] = [];
                for (const leaf of leaves) {
                  const id = leaf.properties?.id;
                  if (id) {
                    const item = validItems.find((item) => item.id === id);
                    if (
                      item &&
                      item.longitude != null &&
                      item.latitude != null
                    ) {
                      items.push(item);
                    }
                  }
                }

                const listHtml = items
                  .map((item) => {
                    const salaryText =
                      item.salary?.min && item.salary?.max
                        ? `${item.salary.min / 1000}k-${
                            item.salary.max / 1000
                          }k`
                        : '';
                    const degreeText = item.degree || '';
                    const yearText = item.year != null ? `${item.year}年` : '';

                    return `
                    <div class="cluster-item" data-id="${item.id}" style="
                      padding: 8px;
                      border-bottom: 1px solid #eee;
                      cursor: pointer;
                    " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                      <div style="font-weight: 500; font-size: 13px;">${
                        item.name
                      }</div>
                      <div style="font-size: 11px; color: #666;">${
                        item.company || ''
                      }</div>
                      <div style="font-size: 11px; color: #1976d2;">
                        ${salaryText} ${degreeText} ${yearText}
                      </div>
                    </div>
                  `;
                  })
                  .join('');

                const popupHtml = `
                  <div style="min-width: 220px; max-height: 350px; display: flex; flex-direction: column; overflow-y: auto;">
                    <div style="font-weight: 500; padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                      <span>选择职位 (${items.length})</span>
                      <span class="popup-close" style="cursor: pointer; font-size: 18px; color: #999;">&times;</span>
                    </div>
                    ${listHtml}
                  </div>
                `;

                clusterPopupRef.current = new maplibregl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  maxWidth: '250px',
                })
                  .setLngLat(ev.lngLat)
                  .setHTML(popupHtml)
                  .addTo(map);

                const popupEl = clusterPopupRef.current.getElement();

                popupEl.addEventListener('click', (e) => {
                  const target = e.target as HTMLElement;

                  if (target.classList.contains('popup-close')) {
                    clusterPopupRef.current?.remove();
                    return;
                  }

                  const itemEl = target.closest('.cluster-item');
                  if (itemEl) {
                    const id = itemEl.getAttribute('data-id');
                    const clickedItem = items.find((i) => i.id === id);
                    if (clickedItem && mapRef.current) {
                      mapRef.current.flyTo({
                        center: [clickedItem.longitude!, clickedItem.latitude!],
                        zoom: 15,
                        duration: 500,
                      });
                    }
                    if (id) {
                      onItemClick?.(id);
                    }
                    clusterPopupRef.current?.remove();
                  }
                });
              });
            });

            map.on('click', 'unclustered-point', (ev) => {
              const features = map.queryRenderedFeatures(ev.point, {
                layers: ['unclustered-point'],
              });
              if (!features.length) return;

              const props = features[0].properties;
              if (props?.id) {
                if (popupRef.current) {
                  popupRef.current.remove();
                  popupRef.current = null;
                }
                onItemClick?.(props.id);
              }
            });

            map.on('mouseenter', 'unclustered-point', (ev) => {
              const features = map.queryRenderedFeatures(ev.point, {
                layers: ['unclustered-point'],
              });
              if (!features.length) return;

              const props = features[0].properties;
              if (!props?.id) return;

              const item = validItems.find((i) => i.id === props.id);
              if (!item || item.longitude == null || item.latitude == null)
                return;

              if (popupRef.current) {
                popupRef.current.remove();
              }

              popupRef.current = new maplibregl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false,
              })
                .setLngLat([item.longitude, item.latitude])
                .setHTML(createPopupContent(item))
                .addTo(map);
            });

            map.on('mouseleave', 'unclustered-point', () => {
              if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
              }
            });

            map.on('click', 'clusters', (ev) => {
              const features = map.queryRenderedFeatures(ev.point, {
                layers: ['clusters'],
              });
              if (!features.length) return;

              const feature = features[0];
              const clusterId = feature.properties?.cluster_id;
              if (clusterId == null) return;

              const source = map.getSource(
                'locations'
              ) as maplibregl.GeoJSONSource;
              if (!source) return;

              source.getClusterLeaves(clusterId, 10000, 0).then((leaves) => {
                const items: MapItem[] = [];
                for (const leaf of leaves) {
                  const id = leaf.properties?.id;
                  if (id) {
                    const item = validItems.find((item) => item.id === id);
                    if (
                      item &&
                      item.longitude != null &&
                      item.latitude != null
                    ) {
                      items.push(item);
                    }
                  }
                }

                if (clusterPopupRef.current) {
                  clusterPopupRef.current.remove();
                }

                const listHtml = items
                  .map((item) => {
                    const salaryText =
                      item.salary?.min && item.salary?.max
                        ? `${item.salary.min / 1000}k-${
                            item.salary.max / 1000
                          }k`
                        : '';
                    const degreeText = item.degree || '';
                    const yearText = item.year != null ? `${item.year}年` : '';

                    return `
                    <div class="cluster-item" data-id="${item.id}" style="
                      padding: 8px;
                      border-bottom: 1px solid #eee;
                      cursor: pointer;
                    " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                      <div style="font-weight: 500; font-size: 13px;">${
                        item.name
                      }</div>
                      <div style="font-size: 11px; color: #666;">${
                        item.company || ''
                      }</div>
                      <div style="font-size: 11px; color: #1976d2;">
                        ${salaryText} ${degreeText} ${yearText}
                      </div>
                    </div>
                  `;
                  })
                  .join('');

                const popupHtml = `
                  <div style="min-width: 220px; max-height: 350px; display: flex; flex-direction: column; overflow-y: auto;">
                    <div style="font-weight: 500; padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                      <span>选择职位 (${items.length})</span>
                      <span class="popup-close" style="cursor: pointer; font-size: 18px; color: #999;">&times;</span>
                    </div>
                    ${listHtml}
                  </div>
                `;

                clusterPopupRef.current = new maplibregl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  maxWidth: '250px',
                })
                  .setLngLat(ev.lngLat)
                  .setHTML(popupHtml)
                  .addTo(map);

                const popupEl = clusterPopupRef.current.getElement();

                popupEl.addEventListener('click', (e) => {
                  const target = e.target as HTMLElement;

                  if (target.classList.contains('popup-close')) {
                    clusterPopupRef.current?.remove();
                    return;
                  }

                  const itemEl = target.closest('.cluster-item');
                  if (itemEl) {
                    const id = itemEl.getAttribute('data-id');
                    const clickedItem = items.find((i) => i.id === id);
                    if (clickedItem && mapRef.current) {
                      mapRef.current.flyTo({
                        center: [clickedItem.longitude!, clickedItem.latitude!],
                        zoom: 15,
                        duration: 500,
                      });
                    }
                    if (id) {
                      onItemClick?.(id);
                    }
                    clusterPopupRef.current?.remove();
                  }
                });
              });
            });

            map.on('click', (e) => {
              if (clusterPopupRef.current) {
                const popupEl = clusterPopupRef.current.getElement();
                const target = e.originalEvent?.target as HTMLElement;
                if (!popupEl.contains(target)) {
                  clusterPopupRef.current.remove();
                  clusterPopupRef.current = null;
                }
              }
            });

            handleMapLoad();
          }
        }}
        style={{ height: height ?? '100%' }}
        attributionControl={false}
      >
        {mode === 'multi' && (
          <Source
            id="locations"
            type="geojson"
            data={geojsonData}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer
              id="clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': '#228be6',
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20,
                  10,
                  25,
                  50,
                  30,
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 12,
              }}
              paint={{
                'text-color': '#ffffff',
              }}
            />
            <Layer
              id="unclustered-point"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-color': '#228be6',
                'circle-radius': 10,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
