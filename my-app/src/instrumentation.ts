import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { registerOTel } from '@vercel/otel';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

export async function register() {
  // Only initialize OpenTelemetry in Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Dynamic imports to ensure these modules are only loaded in Node.js runtime
      const { AzureMonitorTraceExporter, AzureMonitorLogExporter } = await import('@azure/monitor-opentelemetry-exporter');
      
      const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      
      if (!connectionString) {
        console.warn('APPLICATIONINSIGHTS_CONNECTION_STRING not found. OpenTelemetry will not be initialized.');
        return;
      }

      const traceExporter: SpanExporter = new AzureMonitorTraceExporter({
        connectionString
      });
      
      const logExporter = new AzureMonitorLogExporter({
        connectionString
      });

      registerOTel({ 
        serviceName: 'nextjs-weather',
        traceExporter,
        logRecordProcessors: [
          new BatchLogRecordProcessor(logExporter, { 
            maxExportBatchSize: 100 
          })
        ]
      });

      console.log('OpenTelemetry initialized with Azure Monitor');
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
    }
  }
}
