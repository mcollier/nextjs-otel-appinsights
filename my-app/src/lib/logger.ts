import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import winston, { type Logger } from "winston";
import { context, trace } from "@opentelemetry/api";

// Create console format with trace ID
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const span = trace.getSpan(context.active());
        const traceId = span ? span.spanContext().traceId : 'unknown';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [traceId: ${traceId}] ${level}: ${message}${metaStr}`;
    }),
    winston.format.colorize({ all: true })
);

// Create OpenTelemetry transport with error handling
const createOtelTransport = () => {
    try {
        return new OpenTelemetryTransportV3();
    } catch (error) {
        console.warn('Failed to create OpenTelemetry transport:', error);
        return null;
    }
};

// Create transports array
const transports: winston.transport[] = [
    new winston.transports.Console({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: consoleFormat,
    })
];

// Add OpenTelemetry transport if available
const otelTransport = createOtelTransport();
if (otelTransport) {
    transports.push(otelTransport);
    console.log('✅ OpenTelemetry Winston transport initialized');
} else {
    console.warn('⚠️  OpenTelemetry Winston transport failed to initialize');
}

const logger: Logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports,
    // Add exception and rejection handlers
    exceptionHandlers: [
        new winston.transports.Console({
            format: consoleFormat
        })
    ],
    rejectionHandlers: [
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

export default logger;