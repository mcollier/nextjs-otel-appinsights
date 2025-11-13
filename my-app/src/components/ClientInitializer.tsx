'use client';

import { useEffect } from 'react';
import clientLogger from '@/lib/clientLogger';

export default function ClientInitializer() {
  useEffect(() => {
    // Initialize client-side Application Insights
    clientLogger.info('Application initialized on client-side');
    clientLogger.trackPageView('Application Start');
    
    // Track unhandled errors
    const handleError = (event: ErrorEvent) => {
      clientLogger.trackException(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'unhandled_error'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      clientLogger.trackException(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          type: 'unhandled_promise_rejection'
        }
      );
    };

    // Add global error handlers
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clientLogger.flush(); // Ensure any pending telemetry is sent
    };
  }, []);

  return null; // This component doesn't render anything
}