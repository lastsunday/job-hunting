import { Map } from '@vis.gl/react-maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Text } from '@mantine/core';
import { useEffect, useRef, useCallback, useState } from 'react';
import classes from './LocationMap.module.css';

export interface MapItem {
  id: string;
  name: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  salary?: { min?: number; max?: number };
  company?: string;
}

export interface LocationMapProps {
  mode: 'single' | 'multi';
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
  const [mapReady, setMapReady] = useState(false);

  const validItems =
    items?.filter((item) => item.longitude != null && item.latitude != null) ??
    [];

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

  const centerLng =
    mode === 'single'
      ? longitude!
      : validItems.length > 0
      ? validItems.reduce((sum, i) => sum + (i.longitude ?? 0), 0) /
        validItems.length
      : 116.4;

  const centerLat =
    mode === 'single'
      ? latitude!
      : validItems.length > 0
      ? validItems.reduce((sum, i) => sum + (i.latitude ?? 0), 0) /
        validItems.length
      : 39.9;

  const createPopupContent = useCallback((item: MapItem) => {
    const salaryText =
      item.salary?.min && item.salary?.max
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

    return `
      <div class="${classes.popup}">
        <div class="${classes.popupTitle}">${item.name || '位置'}</div>
        ${companyText}
        ${addressText}
        ${salaryText}
        <div class="${classes.popupCoords}">${item.longitude?.toFixed(
      6
    )}, ${item.latitude?.toFixed(6)}</div>
      </div>
    `;
  }, []);

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

  const updateData = useCallback(() => {
    if (!mapRef.current || !mapReady || mode !== 'multi') return;

    const map = mapRef.current;
    const sourceId = 'locations';

    if (!map.getSource(sourceId)) return;

    const geojson: GeoJSON.FeatureCollection = {
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

    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);

    setTimeout(() => {
      fitBounds();
    }, 200);
  }, [validItems, mode, mapReady, fitBounds]);

  useEffect(() => {
    if (!mapRef.current || !mapReady || mode !== 'multi') return;
    updateData();
  }, [updateData, mapReady, mode]);

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

  const setupLayers = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const sourceId = 'locations';
    const layerId = 'clusters';
    const clusterCountId = 'cluster-count';
    const unclusteredPointId = 'unclustered-point';

    if (map.getLayer(layerId)) return;

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#228be6',
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 50, 30],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    map.addLayer({
      id: clusterCountId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    map.addLayer({
      id: unclusteredPointId,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#228be6',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    map.on('click', layerId, (e: maplibregl.MapMouseEvent) => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: [layerId],
      });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [
            number,
            number
          ],
          zoom: zoom ?? 10,
        });
      });
    });

    map.on('click', unclusteredPointId, (e: maplibregl.MapMouseEvent) => {
      e.originalEvent.stopPropagation();

      const features = map.queryRenderedFeatures(e.point, {
        layers: [unclusteredPointId],
      });
      if (!features.length) return;

      const props = features[0].properties;
      const coords = (features[0].geometry as GeoJSON.Point).coordinates as [
        number,
        number
      ];

      if (popupRef.current) {
        popupRef.current.remove();
      }

      const item: MapItem = {
        id: props?.id || '',
        name: props?.name || '',
        address: props?.address,
        company: props?.company,
        salary: props?.salaryMin
          ? { min: props.salaryMin, max: props.salaryMax }
          : undefined,
        longitude: coords[0],
        latitude: coords[1],
      };

      popupRef.current = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      })
        .setLngLat(coords)
        .setHTML(createPopupContent(item))
        .addTo(map);

      if (props?.id && onItemClick) {
        onItemClick(props.id);
      }
    });

    map.on('click', () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    });

    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', unclusteredPointId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', unclusteredPointId, () => {
      map.getCanvas().style.cursor = '';
    });
  }, [mode, onItemClick, createPopupContent]);

  const handleMapLoad = useCallback(() => {
    if (mode === 'multi') {
      setupLayers();
      setMapReady(true);
      setTimeout(() => {
        fitBounds();
      }, 300);
    }
  }, [mode, setupLayers, fitBounds]);

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
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19,
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
          } else {
            handleMapLoad();
          }
        }}
        style={{ height: height ?? '100%' }}
        attributionControl={false}
      />
    </div>
  );
}
