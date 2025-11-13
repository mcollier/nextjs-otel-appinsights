'use client';

import { ApplicationInsights, SeverityLevel } from '@microsoft/applicationinsights-web';

// Types for trace correlation
interface TraceContext {
  operationId?: string;
  operationParentId?: string;
  operationName?: string;
}

interface LogProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// Type for API responses that may contain trace metadata
interface ApiResponseWithTrace {
  _trace?: TraceContext;
  [key: string]: unknown;
}

class ClientLogger {
  private appInsights: ApplicationInsights | null = null;
  private initialized = false;
  private traceContext: TraceContext | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    const connectionString = process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING;
    
    if (!connectionString) {
      console.warn('⚠️ NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING not found. Client logger will work with console only.');
      this.initialized = true; // Allow console logging even without Application Insights
      return;
    }

    try {
      this.appInsights = new ApplicationInsights({
        config: {
          connectionString,
          // Auto-collection settings
          enableAutoRouteTracking: true,
          enableCorsCorrelation: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          // Performance settings
          enableAjaxErrorStatusText: true,
          enableAjaxPerfTracking: true,
          enableUnhandledPromiseRejectionTracking: true,
          // Privacy settings
          disableCookiesUsage: false,
          // Custom settings
          samplingPercentage: 100,
          maxBatchInterval: 15000,
          maxBatchSizeInBytes: 65536
        }
      });

      this.appInsights.loadAppInsights();
      this.initialized = true;
      
      console.log('✅ Application Insights client logger initialized');
      
      // Track page view for initial page load
      this.appInsights.trackPageView();
      
    } catch (error) {
      console.error('❌ Failed to initialize Application Insights client logger:', error);
    }
  }

  // Set trace context for correlation with server-side logs
  setTraceContext(context: TraceContext) {
    this.traceContext = context;
    
    if (this.appInsights && context.operationId) {
      // Set operation context for correlation
      this.appInsights.addTelemetryInitializer((envelope) => {
        if (envelope.tags) {
          envelope.tags['ai.operation.id'] = context.operationId!;
          if (context.operationParentId) {
            envelope.tags['ai.operation.parentId'] = context.operationParentId;
          }
          if (context.operationName) {
            envelope.tags['ai.operation.name'] = context.operationName;
          }
        }
        return true;
      });
    }
  }

  // Extract trace context from API response
  extractTraceFromResponse(response: ApiResponseWithTrace): TraceContext | null {
    if (response && response._trace) {
      const traceContext = {
        operationId: response._trace.operationId,
        operationParentId: response._trace.operationParentId,
        operationName: response._trace.operationName
      };
      this.setTraceContext(traceContext);
      return traceContext;
    }
    return null;
  }

  // Winston-compatible logging methods
  info(message: string, properties?: LogProperties) {
    this.log('Information', message, properties);
  }

  warn(message: string, properties?: LogProperties) {
    this.log('Warning', message, properties);
  }

  error(message: string, properties?: LogProperties) {
    this.log('Error', message, properties);
  }

  debug(message: string, properties?: LogProperties) {
    this.log('Verbose', message, properties);
  }

  private log(severityLevel: string, message: string, properties?: LogProperties) {
    // Console logging for development and explicit calls for production removal
    const clientMessage = `[CLIENT] ${message}`;
    const logData = properties || '';
    
    // Use explicit console methods so Next.js removeConsole can detect them
    if (severityLevel === 'Error') {
      console.error(clientMessage, logData);
    } else if (severityLevel === 'Warning') {
      console.warn(clientMessage, logData);
    } else if (severityLevel === 'Verbose') {
      console.debug(clientMessage, logData);
    } else {
      console.log(clientMessage, logData);
    }

    if (!this.appInsights) {
      return;
    }

    // Combine trace context with custom properties
    const telemetryProperties = {
      ...properties,
      source: 'client',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...(this.traceContext && {
        serverOperationId: this.traceContext.operationId,
        serverOperationParentId: this.traceContext.operationParentId,
        serverOperationName: this.traceContext.operationName
      })
    };

    // Send to Application Insights as trace
    this.appInsights.trackTrace({
      message,
      severityLevel: this.getSeverityLevel(severityLevel),
      properties: telemetryProperties
    });
  }

  private getSeverityLevel(level: string): SeverityLevel {
    // Map to Application Insights severity levels
    switch (level) {
      case 'Verbose': return SeverityLevel.Verbose;
      case 'Information': return SeverityLevel.Information;
      case 'Warning': return SeverityLevel.Warning;
      case 'Error': return SeverityLevel.Error;
      case 'Critical': return SeverityLevel.Critical;
      default: return SeverityLevel.Information;
    }
  }

  // Application Insights specific methods
  trackEvent(name: string, properties?: LogProperties, measurements?: { [key: string]: number }) {
    console.log(`[CLIENT EVENT] ${name}`, properties || '');
    
    if (!this.appInsights) return;

    this.appInsights.trackEvent({
      name,
      properties: {
        ...properties,
        source: 'client',
        ...(this.traceContext && {
          serverOperationId: this.traceContext.operationId
        })
      },
      measurements
    });
  }

  trackException(exception: Error, properties?: LogProperties) {
    console.error('[CLIENT EXCEPTION]', exception, properties || '');
    
    if (!this.appInsights) return;

    this.appInsights.trackException({
      exception,
      properties: {
        ...properties,
        source: 'client',
        ...(this.traceContext && {
          serverOperationId: this.traceContext.operationId
        })
      }
    });
  }

  trackPageView(name?: string, properties?: LogProperties) {
    if (!this.appInsights) return;

    this.appInsights.trackPageView({
      name,
      properties: {
        ...properties,
        source: 'client'
      }
    });
  }

  trackDependency(name: string, data: string, duration: number, success: boolean, properties?: LogProperties) {
    if (!this.appInsights) return;

    this.appInsights.trackDependencyData({
      id: `dep-${Date.now()}`,
      name,
      data,
      duration,
      success,
      responseCode: success ? 200 : 500,
      properties: {
        ...properties,
        source: 'client',
        ...(this.traceContext && {
          serverOperationId: this.traceContext.operationId
        })
      }
    });
  }

  // Performance tracking
  startTrackingOperation(name: string): string {
    const operationId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.appInsights) {
      this.appInsights.startTrackEvent(name);
    }
    
    return operationId;
  }

  stopTrackingOperation(operationId: string, properties?: LogProperties) {
    if (this.appInsights) {
      // Convert properties to the expected format for stopTrackEvent
      const stringProperties: { [key: string]: string } = {};
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          stringProperties[key] = String(value ?? '');
        });
      }
      this.appInsights.stopTrackEvent(operationId, stringProperties);
    }
  }

  // Flush any pending telemetry (useful for page unload)
  flush() {
    if (this.appInsights) {
      this.appInsights.flush();
    }
  }
}

// Create singleton instance
const clientLogger = new ClientLogger();

export default clientLogger;