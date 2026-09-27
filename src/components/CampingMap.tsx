import { useMemo, useRef, useState } from 'react'
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native'
import {
  Map,
  Camera,
  GeoJSONSource,
  RasterSource,
  Layer,
  type CameraRef,
  type GeoJSONSourceRef,
  type PressEvent,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native'
import { router } from 'expo-router'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { useSites } from '@/hooks/useSites'
import {
  CATEGORY_COLORS,
  FILTER_CATEGORIES,
  categoryOf,
  type FilterCategory,
  type Site,
} from '@/types'
import { FilterPanel } from './FilterPanel'

/** Same OpenFreeMap style the web app uses — free vector tiles, no API key. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

const INITIAL_CENTER: [number, number] = [-98.5, 39.5]
const INITIAL_ZOOM = 3.4

const SOURCE_ID = 'sites'

/**
 * BLM land overlay only, for now — same pre-cached tile source as the web
 * app's src/map/publicLand.ts. Its plain {z}/{y}/{x} tile URL is standard
 * XYZ raster tiling, supported by every map SDK including MapLibre Native.
 *
 * The National Forest overlay is NOT ported here. The web version relies on
 * a MapLibre GL JS-specific trick — the `{bbox-epsg-3857}` URL token, which
 * lets a *live* ArcGIS export endpoint act as a raster tile source. That
 * token is a web-renderer feature; whether MapLibre Native (the different,
 * C++-based engine this library wraps for Android/iOS) supports it too is
 * unverified — couldn't be tested without a real device build. Left out
 * rather than shipped as an unverified guess. See the mobile app's README.
 */
const BLM_TILE_URL =
  'https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_BLM_Only/MapServer/tile/{z}/{y}/{x}'

type SiteFeature = Feature<Point, { id: string; category: FilterCategory }>
type ClusterFeature = Feature<Point, { cluster: true; cluster_id: number; point_count: number }>

function toFeatureCollection(sites: Site[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: sites.map(
      (site): SiteFeature => ({
        type: 'Feature',
        properties: { id: site.id, category: categoryOf(site) },
        geometry: { type: 'Point', coordinates: [site.lon, site.lat] },
      }),
    ),
  }
}

/**
 * MapLibre `match` expression pairing each category with its pin color —
 * mirrors CATEGORY_COLORS from the web app, flattened into the tuple shape a
 * style expression needs.
 *
 * Typed as `any[]`: the style spec's expression types are a large discriminated
 * union keyed on the literal first element, which TS can't infer from a
 * built-up array like this one — same accommodation the web app makes in
 * src/map/siteLayers.ts for the equivalent expression.
 */
const CATEGORY_COLOR_MATCH: any[] = [
  'match',
  ['get', 'category'],
  ...FILTER_CATEGORIES.flatMap((category) => [category, CATEGORY_COLORS[category]]),
  '#3d6fc2',
]

export function CampingMap() {
  const { sites } = useSites()
  const [visible, setVisible] = useState<Set<FilterCategory>>(new Set(FILTER_CATEGORIES))
  const [showBlmLand, setShowBlmLand] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sourceRef = useRef<GeoJSONSourceRef>(null)
  const cameraRef = useRef<CameraRef>(null)

  const featureCollection = useMemo(() => {
    const filtered = sites.filter((site) => visible.has(categoryOf(site)))
    return toFeatureCollection(filtered)
  }, [sites, visible])

  async function handleSourcePress(
    event: NativeSyntheticEvent<PressEvent> | NativeSyntheticEvent<PressEventWithFeatures>,
  ) {
    const nativeEvent = event.nativeEvent
    if (!('features' in nativeEvent)) return
    const feature = nativeEvent.features[0]
    if (!feature) return

    if (feature.properties?.cluster) {
      const cluster = feature as unknown as ClusterFeature
      if (!sourceRef.current) return
      const zoom = await sourceRef.current.getClusterExpansionZoom(cluster.properties.cluster_id)
      const center = cluster.geometry.coordinates as [number, number]
      cameraRef.current?.easeTo({ center, zoom, duration: 300 })
      return
    }

    const site = feature as unknown as SiteFeature
    const id = site.properties?.id
    if (id) router.push(`/site/${id}`)
  }

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={STYLE_URL} logo={false} onPress={handleSourcePress}>
        <Camera ref={cameraRef} initialViewState={{ center: INITIAL_CENTER, zoom: INITIAL_ZOOM }} />

        {/* Rendered before the pins source so it sits underneath — same
            reasoning as the web app's `beforeLayerId`. */}
        <RasterSource id="blm-land" tiles={[BLM_TILE_URL]} tileSize={256} maxzoom={15}>
          <Layer
            id="blm-land-fill"
            type="raster"
            layout={{ visibility: showBlmLand ? 'visible' : 'none' }}
            paint={{ 'raster-opacity': 0.45 }}
          />
        </RasterSource>

        <GeoJSONSource
          ref={sourceRef}
          id={SOURCE_ID}
          data={featureCollection}
          cluster
          clusterRadius={50}
          clusterMaxZoom={11}
        >
          <Layer
            id="sites-cluster"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#2f7a4d',
              'circle-opacity': 0.85,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-radius': ['step', ['get', 'point_count'], 16, 50, 22, 250, 30],
            }}
          />
          <Layer
            id="sites-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': 12,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id="sites-point"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={
              {
                'circle-radius': 7,
                'circle-color': CATEGORY_COLOR_MATCH,
                'circle-opacity': 0.9,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
              } as any
            }
          />
        </GeoJSONSource>
      </Map>

      <FilterPanel
        open={filtersOpen}
        onToggleOpen={() => setFiltersOpen((open) => !open)}
        visible={visible}
        onChange={setVisible}
        showBlmLand={showBlmLand}
        onToggleBlmLand={setShowBlmLand}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
})
