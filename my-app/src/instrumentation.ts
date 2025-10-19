import { registerOTel } from '@vercel/otel'
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter'
 
export function register() {
  registerOTel({ 
    serviceName: 'next-app',
    traceExporter: new AzureMonitorTraceExporter({
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
    }),
  })
}