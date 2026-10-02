import { createLogger, format, transports } from 'winston';

const customLogger = createLogger({
    transports: [
        new transports.File({
            filename: 'logs/log.log',
            level: process.env.LOG_LEVEL ?? 'info',
            format: format.combine(
                format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss:SSS' }),
                format.align(),
                format.printf((info) => `${info.timestamp}: [${String(info.level).toUpperCase()}]: ${String(info.message)}`),
            ),
        }),
    ],
});

export { customLogger };
