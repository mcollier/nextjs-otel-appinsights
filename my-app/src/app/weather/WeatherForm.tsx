'use client';

import { FormEvent, useState } from 'react';
import clientLogger from '@/lib/clientLogger';

type WeatherResponse = {
  location: string;
  temperature: number;
  description: string;
  humidity?: number;
  windSpeed?: number;
};

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: WeatherResponse }
  | { status: 'error'; message: string };

const ZIP_PATTERN = /^[0-9]{5}$/;

export default function WeatherForm() {
  const [zip, setZip] = useState('');
  const [state, setState] = useState<FetchState>({ status: 'idle' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Log form submission attempt
    clientLogger.info('Weather form submission started', { zipCode: zip });
    clientLogger.trackEvent('WeatherFormSubmitted', { zipCode: zip });

    if (!ZIP_PATTERN.test(zip)) {
      const errorMsg = 'Please enter a valid 5-digit ZIP code.';
      clientLogger.warn('Form validation failed', { zipCode: zip, reason: 'invalid_format' });
      clientLogger.trackEvent('WeatherFormValidationFailed', { zipCode: zip, reason: 'invalid_format' });
      setState({ status: 'error', message: errorMsg });
      return;
    }

    setState({ status: 'loading' });
    const requestStartTime = Date.now();

    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zip }),
      });

      const requestDuration = Date.now() - requestStartTime;
      clientLogger.info('Weather API response received', { 
        status: response.status, 
        zipCode: zip,
        duration: requestDuration
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) ?? {};
        const message = typeof errorBody.error === 'string' ? errorBody.error : 'Unable to fetch weather data.';
        
        // Extract trace context from error response
        clientLogger.extractTraceFromResponse(errorBody);
        
        clientLogger.error('Weather API request failed', {
          status: response.status,
          zipCode: zip,
          errorMessage: message,
          duration: requestDuration
        });
        
        clientLogger.trackEvent('WeatherAPIFailed', {
          zipCode: zip,
          status: response.status,
          errorMessage: message,
          duration: requestDuration
        });
        
        setState({ status: 'error', message });
        return;
      }

      const payload = (await response.json()) as WeatherResponse;
      
      // Extract and set trace context for correlation
      clientLogger.extractTraceFromResponse(payload);
      
      clientLogger.info('Weather data received successfully', {
        zipCode: zip,
        location: payload.location,
        temperature: payload.temperature,
        duration: requestDuration
      });
      
      clientLogger.trackEvent('WeatherAPISuccess', {
        zipCode: zip,
        location: payload.location,
        temperature: payload.temperature,
        duration: requestDuration
      });
      
      setState({ status: 'success', data: payload });
    } catch (error) {
      const requestDuration = Date.now() - requestStartTime;
      const errorMessage = 'Network error. Please try again.';
      
      clientLogger.error('Weather API network error', {
        zipCode: zip,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: requestDuration
      });
      
      clientLogger.trackException(error instanceof Error ? error : new Error('Network error'), {
        zipCode: zip,
        operation: 'weather_api_request',
        duration: requestDuration
      });
      
      setState({ status: 'error', message: errorMessage });
    }
  };

  const isLoading = state.status === 'loading';

  return (
    <section className="w-full max-w-md rounded-lg border border-gray-200 p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">Check the Weather</h1>
      <p className="mt-2 text-sm text-gray-600">Enter your ZIP code below to fetch the current weather.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <label className="flex flex-col gap-1" htmlFor="zip">
          <span className="text-sm font-medium text-gray-700">ZIP Code</span>
          <input
            id="zip"
            name="zip"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            required
            placeholder="12345"
            value={zip}
            onChange={(event) => {
              setZip(event.target.value.slice(0, 5));
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-describedby="zip-help"
            autoComplete="postal-code"
            spellCheck={false}
            suppressHydrationWarning
            maxLength={5}
            title="Enter a 5-digit ZIP code"
            disabled={isLoading}
          />
        </label>
        <p id="zip-help" className="text-xs text-gray-500">
          Please enter a 5-digit ZIP code.
        </p>

        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-blue-400"
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : 'Submit'}
        </button>
      </form>

      {state.status === 'error' && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.status === 'success' && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-gray-800">
          <div className="text-base font-semibold text-gray-900">{state.data.location}</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{Math.round(state.data.temperature)}°F</div>
          <div className="capitalize text-gray-600">{state.data.description}</div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
            {typeof state.data.humidity === 'number' && (
              <div className="rounded bg-white/70 p-2 shadow-inner">
                <dt className="font-medium text-gray-700">Humidity</dt>
                <dd>{state.data.humidity}%</dd>
              </div>
            )}
            {typeof state.data.windSpeed === 'number' && (
              <div className="rounded bg-white/70 p-2 shadow-inner">
                <dt className="font-medium text-gray-700">Wind</dt>
                <dd>{Math.round(state.data.windSpeed)} mph</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}
