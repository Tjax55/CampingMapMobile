import { useEffect, useState } from 'react'

const METERS_TO_FEET = 3.28084

/**
 * Elevation in feet for a point, looked up from Open-Meteo's free elevation
 * API when a site is opened — the sites table has no elevation stored.
 * Returns null while loading or if the lookup fails (offline, service down),
 * which the screen shows as a dash rather than an error: elevation is a
 * nice-to-have, not worth interrupting anything over.
 */
export function useElevation(lat: number | undefined, lon: number | undefined): number | null {
  const [feet, setFeet] = useState<number | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false

    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { elevation?: number[] } | null) => {
        const meters = body?.elevation?.[0]
        if (!cancelled && typeof meters === 'number') setFeet(Math.round(meters * METERS_TO_FEET))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return feet
}
