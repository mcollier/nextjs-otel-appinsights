import { NextResponse } from 'next/server';
import logger from '../../../lib/logger';

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

  logger.info('=== Weather API Request Started ===');
  logger.debug('Received weather request');

  if (!apiKey) {
    logger.error('OPENWEATHER_API_KEY is not configured');
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

  logger.debug(`Received ZIP code: ${zip}`);
  
  if (!ZIP_REGEX.test(zip)) {
    logger.error(`Invalid ZIP code received: ${zip}`);
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

    logger.debug('Weather service responded');
    logger.debug(`Weather service status: ${response.status}`);
    logger.debug(`Weather service headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    logger.debug('Parsing weather service response');
    const responseBody = await response.json();
    logger.debug(`Weather service response body: ${JSON.stringify(responseBody)}`);

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
      const message = errorPayload?.message ?? 'Failed to retrieve weather data.';
      const status = response.status === 404 ? 404 : 502;
      return NextResponse.json({ error: message }, { status });
    }

    // const data = (await response.json()) as OpenWeatherSuccess;
    const data = responseBody as OpenWeatherSuccess;

    const weatherData = {
      location: data.name || `ZIP ${zip}`,
      temperature: data.main?.temp ?? 0,
      description: data.weather?.[0]?.description ?? 'Unavailable',
      humidity: data.main?.humidity,
      windSpeed: data.wind?.speed,
    };

    logger.info('=== Weather API Request Successful ===', { weatherData });
    return NextResponse.json(weatherData);
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while contacting the weather service.' },
      { status: 502 },
    );
  }
}
