import { NextResponse } from 'next/server';

const ZIP_REGEX = /^[0-9]{5}$/;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

type OpenWeatherSuccess = {
  name: string;
  main?: {
    temp?: number;
    humidity?: number;
  };
  weather?: Array<{ description?: string }>;
  wind?: {
    speed?: number;
  };
};

type IncomingBody = {
  zip?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Weather service is not configured.' },
      { status: 500 },
    );
  }

  let body: IncomingBody;

  try {
    body = (await request.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const zip = typeof body.zip === 'string' ? body.zip.trim() : '';

  if (!ZIP_REGEX.test(zip)) {
    return NextResponse.json({ error: 'ZIP code must be 5 digits.' }, { status: 422 });
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('zip', `${zip},US`);
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('appid', apiKey);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
      const message = errorPayload?.message ?? 'Failed to retrieve weather data.';
      const status = response.status === 404 ? 404 : 502;
      return NextResponse.json({ error: message }, { status });
    }

    const data = (await response.json()) as OpenWeatherSuccess;

    return NextResponse.json({
      location: data.name || `ZIP ${zip}`,
      temperature: data.main?.temp ?? 0,
      description: data.weather?.[0]?.description ?? 'Unavailable',
      humidity: data.main?.humidity,
      windSpeed: data.wind?.speed,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while contacting the weather service.' },
      { status: 502 },
    );
  }
}
