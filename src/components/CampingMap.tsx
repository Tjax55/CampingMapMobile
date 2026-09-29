import { useMemo, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View, type NativeSyntheticEvent } from 'react-native'
import {
  Map,
  Camera,
  GeoJSONSource,
  RasterSource,
  Layer,
  LocationManager,
  type CameraRef,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { useSites } from '@/hooks/useSites'
import { displayNameFor, useAuth } from '@/lib/useAuth'
import {
  CATEGORY_COLORS,
  FILTER_CATEGORIES,
  categoryOf,
  type FilterCategory,
  type Site,
} from '@/types'
import { FilterPanel } from './FilterPanel'
import { SiteDetailPanel } from './SiteDetailPanel'
import { SubmitPanel } from './SubmitPanel'

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
  const { sites, loading, error } = useSites()
  const { session, signOut } = useAuth()
  const [visible, setVisible] = useState<Set<FilterCategory>>(new Set(FILTER_CATEGORIES))
  const [showBlmLand, setShowBlmLand] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Both rendered as overlays on top of this same, permanently-mounted map —
  // see SiteDetailPanel's comment for why that's deliberate, not a shortcut.
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const cameraRef = useRef<CameraRef>(null)

  const featureCollection = useMemo(() => {
    const filtered = sites.filter((site) => visible.has(categoryOf(site)))
    return toFeatureCollection(filtered)
  }, [sites, visible])

  // Attached to GeoJSONSource's onPress, not Map's — Map only receives
  // `features` in its own onPress if a child Source's onPress bubbles them
  // up, which nothing was doing. Taps silently did nothing as a result.
  function handleSourcePress(event: NativeSyntheticEvent<PressEventWithFeatures>) {
    const feature = event.nativeEvent.features[0] as SiteFeature | undefined
    const id = feature?.properties?.id
    if (id) setSelectedSiteId(id)
  }

  async function handleLocateMe() {
    const granted = await LocationManager.requestPermissions()
    if (!granted) {
      Alert.alert(
        'Location permission needed',
        'Enable location access for FreeCamp in your phone settings to use this button.',
      )
      return
    }

    const position = await LocationManager.getCurrentPosition()
    if (!position) {
      Alert.alert("Couldn't get your location", 'Make sure location services are turned on and try again.')
      return
    }

    cameraRef.current?.flyTo({
      center: [position.coords.longitude, position.coords.latitude],
      zoom: 12,
    })
  }

  return (
    <View style={styles.container}>
      {/* Only shown while loading or on error — once sites have loaded
          successfully there's nothing left to diagnose, and leaving a
          permanent banner up overlapped the site detail panel's close
          button. Still covers the original gap (telling "0 sites because
          still loading" apart from "0 sites because the fetch returned
          nothing") since both of those states keep the banner visible. */}
      {(loading || error) && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>
            {error ? `Couldn't load sites: ${error}` : `Loading sites… (${sites.length} so far)`}
          </Text>
        </View>
      )}

      <Map style={styles.map} mapStyle={STYLE_URL} logo={false}>
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

        {/*
         * No clustering. GeoJSONSource's `cluster` prop was tested on a real
         * Android device and confirmed broken in this library version: with
         * it on, nothing rendered until zoomed in far past clusterMaxZoom in
         * one specific spot, and nothing elsewhere — even with the cluster
         * circle's paint simplified to flat, non-expression values. Turning
         * `cluster` off entirely fixed rendering completely (all 8,700+ sites
         * showing correctly at every zoom, confirmed live). The unclustered
         * pin rendering below was never the problem — only the clustering
         * feature itself was. See the mobile app's README.
         */}
        <GeoJSONSource id={SOURCE_ID} data={featureCollection} onPress={handleSourcePress}>
          <Layer
            id="sites-pins"
            type="circle"
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
        signedInAs={session ? displayNameFor(session) : null}
        onSignOut={signOut}
      />

      {/* Floating rather than a native header button — this screen no longer
          uses the Stack header's right-side slot for it, since that slot
          lives in the route file (src/app/index.tsx), outside this
          component, and the overlays it needs to open live in here. */}
      {!selectedSiteId && !submitOpen && (
        <TouchableOpacity style={styles.addButton} onPress={() => setSubmitOpen(true)}>
          <Text style={styles.addButtonText}>Add a spot</Text>
        </TouchableOpacity>
      )}

      {!selectedSiteId && !submitOpen && (
        <TouchableOpacity style={styles.locateButton} onPress={handleLocateMe}>
          <Text style={styles.locateButtonText}>⊙</Text>
        </TouchableOpacity>
      )}

      {selectedSiteId && (
        <SiteDetailPanel siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />
      )}

      {submitOpen && <SubmitPanel onClose={() => setSubmitOpen(false)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statusBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#1d2b23',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statusBannerText: { color: '#f4f1ea', fontSize: 12, textAlign: 'center' },
  addButton: {
    position: 'absolute',
    top: 44,
    right: 12,
    backgroundColor: '#4f9d6b',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  addButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 12 },
  locateButton: {
    position: 'absolute',
    bottom: 24,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locateButtonText: { color: '#1d2b23', fontSize: 22, fontWeight: '600' },
})
