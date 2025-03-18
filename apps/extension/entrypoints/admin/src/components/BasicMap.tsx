import Map, {
  FullscreenControl,
  GeolocateControl,
  Layer,
  MapRef,
  NavigationControl,
  ScaleControl,
  Source,
} from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo, useState } from 'react';

import { JobData } from '../data/JobData';
import './BasicMap.css';
import JobPin from './map/JobPin';
import JobPopup from './map/JobPopup';

import { FeatureCollection } from 'geojson';
import { GeoJSONSource } from 'maplibre-gl';
import { useJob } from '../hooks/job';
import { useUtil } from '../hooks/util';
import JobItemCard from './JobItemCard';
import JobModel from './JobModel';

const { convertJobDataToGeojson } = useJob();

const { createMap } = useUtil();

export type BasicMapProps = {
  data: JobData[];
  longitude: number;
  latitude: number;
  zoom: number;
  locateItem?: JobData;
  initLocateItem?: JobData;
};

const BasicMap: React.FC<BasicMapProps> = ({
  data,
  longitude,
  latitude,
  zoom,
  locateItem,
  initLocateItem,
}) => {
  const [popupInfo, setPopupInfo] = useState(null);
  const mapRef = useRef<MapRef>();
  const [geojsonData, setGeojsonData] = useState<FeatureCollection>();
  const [itemIdMap, setItemIdMap] = useState(null);
  const [clusterData, setClusterData] = useState([]);
  const [jobModalData, setJobModalData] = useState<JobData>();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    setPopupInfo(null);
    const itemMap = createMap();
    data.forEach((item) => {
      itemMap.set(item.id, item);
    });
    setItemIdMap(itemMap);
    setGeojsonData(convertJobDataToGeojson(data));
  }, [data]);

  useEffect(() => {
    if (initLocateItem) {
      if (initLocateItem.longitude != null && initLocateItem.latitude != null) {
        mapRef.current.flyTo({
          center: [initLocateItem.longitude, initLocateItem.latitude],
          zoom: zoom,
        });
      }
    }
  }, [initLocateItem]);

  useEffect(() => {
    locate(locateItem);
  }, [locateItem]);

  const locate = (locateItem: JobData) => {
    setPopupInfo(locateItem);
    if (
      locateItem &&
      locateItem.longitude != null &&
      locateItem.latitude != null
    ) {
      mapRef.current.flyTo({
        center: [locateItem.longitude, locateItem.latitude],
        zoom: 13,
      });
    }
  };

  const markers = useMemo(
    () =>
      data.map((item, index) =>
        item.longitude != null && item.latitude != null ? (
          <JobPin
            key={`JobPin_${item.id}`}
            data={item}
            onClick={(data) => {
              setPopupInfo(data);
            }}
          />
        ) : null
      ),
    [data]
  );

  const onClick = async (event) => {
    const items = [];
    if (event.features && event.features[0]) {
      const feature = event.features[0];
      const layerId = feature.layer.id;
      if (layerId == 'unclustered-point') {
        const item = itemIdMap.get(feature.properties.id);
        items.push(item);
      } else if (layerId == 'clusters') {
        const clusterId = feature.properties.cluster_id;
        const clusterSource = mapRef.current
          .getMap()
          .getSource(feature.source) as GeoJSONSource;
        const ids = [];
        await getJobFromCluster(clusterSource, clusterId, ids);
        ids.forEach((id) => {
          items.push(itemIdMap.get(id));
        });
        // const zoom = await clusterSource.getClusterExpansionZoom(clusterId);
        // mapRef.current.getMap().easeTo({ center: feature.geometry.coordinates, zoom: zoom });
      } else {
        throw `unknown feature id ${layerId}`;
      }
    }
    setClusterData(items);
  };

  const getJobFromCluster = async (clusterSource, clusterId, result) => {
    const ids = await (
      await clusterSource.getClusterChildren(clusterId)
    ).map((item) => item.id);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (Number.isInteger(id)) {
        await getJobFromCluster(clusterSource, id, result);
      } else {
        result.push(id);
      }
    }
  };

  const onCardClickHandle = (data: JobData) => {
    setJobModalData(data);
    setRefresh(!refresh);
  };

  return (
    <>
      <div className="main">
        <Map
          ref={mapRef}
          onClick={onClick}
          interactiveLayerIds={['clusters', 'unclustered-point']}
          initialViewState={{
            longitude: longitude,
            latitude: latitude,
            zoom: zoom,
          }}
          attributionControl={false}
          mapStyle={{
            version: 8,
            glyphs: './font/{fontstack}/{range}.pbf',
            sources: {
              'raster-tiles': {
                type: 'raster',
                tiles: [
                  'http://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                  'http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                  'http://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
                  'http://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
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
        >
          <GeolocateControl position="top-left" />
          <FullscreenControl position="top-left" />
          <NavigationControl position="top-left" />
          <ScaleControl />

          <Source
            id="job"
            type="geojson"
            data={geojsonData}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer
              {...{
                id: 'clusters',
                type: 'circle',
                source: 'job',
                filter: ['has', 'point_count'],
                paint: {
                  'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    100,
                    '#f1f075',
                    750,
                    '#f28cb1',
                  ],
                  'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100,
                    30,
                    750,
                    40,
                  ],
                },
              }}
            />
            <Layer
              {...{
                id: 'cluster-count',
                type: 'symbol',
                source: 'job',
                filter: ['has', 'point_count'],
                layout: {
                  'text-field': '{point_count_abbreviated}',
                  'text-font': ['Open Sans Regular'],
                  'text-size': 14,
                },
              }}
            />
            <Layer
              {...{
                id: 'unclustered-point',
                type: 'circle',
                source: 'job',
                filter: ['!', ['has', 'point_count']],
                paint: {
                  'circle-color': '#11b4da',
                  'circle-radius': 8,
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#fff',
                },
              }}
            />
          </Source>

          {popupInfo && (
            <JobPopup
              data={popupInfo}
              onClick={(data) => {
                setPopupInfo(null);
              }}
            ></JobPopup>
          )}
        </Map>
        <div className="selectClusterWrapper">
          <div className="selectCluster">
            {clusterData &&
              clusterData.map((item, index) => {
                return (
                  <JobItemCard
                    className="item"
                    key={index}
                    data={item}
                    onCardClick={onCardClickHandle}
                    onLocate={locate}
                  ></JobItemCard>
                );
              })}
          </div>
        </div>
        <JobModel data={jobModalData} refresh={refresh}></JobModel>
      </div>
    </>
  );
};

export default BasicMap;
