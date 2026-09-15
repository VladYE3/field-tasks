interface GeocodingResult {
  lat: string;
  lon: string;
}

const GEOCODING_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

function queryVariants(address: string): string[] {
  const trimmed = address.trim();
  const variants = [trimmed];
  if (/kuncevshchina/i.test(trimmed)) {
    variants.push(trimmed.replace(/kuncevshchina/gi, 'Кунцевщина'));
  }
  return variants;
}

export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | undefined> {
  for (const query of queryVariants(address)) {
    try {
      const response = await withTimeout(
        fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`,
          { headers: { Accept: 'application/json', 'User-Agent': 'FieldTasks/1.0' } },
        ),
        GEOCODING_TIMEOUT_MS,
      );
      if (!response?.ok) continue;
      const results = (await response.json()) as GeocodingResult[];
      const first = results[0];
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    } catch {
      // A task can still be saved without coordinates when geocoding is unavailable.
    }
  }
  return undefined;
}
