import type { BusinessProfile, Category } from "./types.js";

// Google Places API (New) — text search endpoint.
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

type PlacesResponse = {
  places?: {
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    addressComponents?: { longText: string; shortText: string; types: string[] }[];
    primaryType?: string;
    types?: string[];
  }[];
};

const TYPE_TO_CATEGORY: Record<string, Category> = {
  restaurant: "restaurant",
  food: "restaurant",
  cafe: "restaurant",
  bar: "restaurant",
  dentist: "dentist",
  lawyer: "lawyer",
  plumber: "plumber",
  spa: "spa",
  beauty_salon: "spa",
};

function inferCategoryFromTypes(types: string[]): Category | null {
  for (const t of types) {
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t]!;
  }
  return null;
}

function pickCityState(addressComponents: { longText: string; shortText: string; types: string[] }[] | undefined) {
  let city: string | null = null;
  let state: string | null = null;
  for (const comp of addressComponents ?? []) {
    if (comp.types.includes("locality")) city = comp.longText;
    if (comp.types.includes("administrative_area_level_1")) state = comp.shortText;
  }
  return { city, state };
}

export async function findBusinessByQuery(query: string): Promise<Partial<BusinessProfile> | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.addressComponents,places.primaryType,places.types",
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as PlacesResponse;
  const place = data.places?.[0];
  if (!place) return null;

  const { city, state } = pickCityState(place.addressComponents);
  const category =
    inferCategoryFromTypes([place.primaryType, ...(place.types ?? [])].filter(Boolean) as string[]) ??
    undefined;

  return {
    name: place.displayName?.text,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    city: city ?? undefined,
    state: state ?? undefined,
    category,
    gbpPlaceId: place.id,
  };
}
