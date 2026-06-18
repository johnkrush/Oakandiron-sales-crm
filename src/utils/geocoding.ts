export interface NominatimResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
}

interface MapboxFeature {
  properties: {
    mapbox_id: string
    name: string
    full_address?: string
    place_formatted?: string
    coordinates: { latitude: number; longitude: number }
    context?: { region?: { name?: string; region_code?: string } }
  }
}

interface NominatimAddress {
  house_number?: string
  road?: string
  pedestrian?: string
  footway?: string
  path?: string
  neighbourhood?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  postcode?: string
  country?: string
}

interface NominatimReverseResult {
  display_name?: string
  address?: NominatimAddress
}

const BASE = 'https://nominatim.openstreetmap.org'
const HEADERS: HeadersInit = {
  'Accept-Language': 'en',
  'User-Agent': 'OakandIronSales/1.0',
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string
// Bias results toward the Oakville canvassing area (lng,lat)
const PROXIMITY = '-79.6877,43.4675'

// Search via Mapbox, restricted to Ontario so reps only see ON places.
export async function searchPlaces(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return []
  try {
    const url =
      `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}` +
      `&country=ca&proximity=${PROXIMITY}&limit=8&language=en` +
      `&types=address,street,neighborhood,locality,place,postcode` +
      `&access_token=${MAPBOX_TOKEN}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const features = (data.features ?? []) as MapboxFeature[]
    return features
      .filter((f) => {
        const region = f.properties?.context?.region
        return region?.region_code === 'ON' || region?.name === 'Ontario'
      })
      .slice(0, 5)
      .map((f) => ({
        place_id: f.properties.mapbox_id,
        display_name: f.properties.full_address || f.properties.name,
        lat: String(f.properties.coordinates.latitude),
        lon: String(f.properties.coordinates.longitude),
      }))
  } catch {
    return []
  }
}

export interface ReverseGeocodeResult {
  address: string
  hasHouseNumber: boolean
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    // zoom=18 requests house-level granularity from Nominatim
    const url = `${BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) return { address: formatCoords(lat, lng), hasHouseNumber: false }
    const data = (await res.json()) as NominatimReverseResult
    return parseAddress(data, lat, lng)
  } catch {
    return { address: formatCoords(lat, lng), hasHouseNumber: false }
  }
}

function parseAddress(data: NominatimReverseResult, lat: number, lng: number): ReverseGeocodeResult {
  const a = data.address
  if (!a) return { address: data.display_name ?? formatCoords(lat, lng), hasHouseNumber: false }

  const houseNumber = a.house_number?.trim() ?? ''
  const road = (a.road ?? a.pedestrian ?? a.footway ?? a.path ?? '').trim()
  const city = (a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '').trim()

  if (houseNumber && road && city) {
    return { address: `${houseNumber} ${road}, ${city}`, hasHouseNumber: true }
  }
  if (houseNumber && road) {
    return { address: `${houseNumber} ${road}`, hasHouseNumber: true }
  }
  if (road && city) {
    return { address: `${road}, ${city}`, hasHouseNumber: false }
  }
  if (road) {
    return { address: road, hasHouseNumber: false }
  }
  return { address: data.display_name ?? formatCoords(lat, lng), hasHouseNumber: false }
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
