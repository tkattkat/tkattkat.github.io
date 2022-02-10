import winston from 'winston';
import 'winston-daily-rotate-file';
const { combine, timestamp, printf, colorize } = winston.format;
import path from 'path';

// TODO: find the log file folder
const LOG_DIR = path.join();

const customFormat = printf(({ level, timestamp, message, process }) => {
	if(typeof message != 'string') try { message = JSON.stringify(message) } catch(err) {};
	return `${timestamp} [${level}] [${process}]: ${message}`;
});

const devTools = process.argv.includes('--devTools');
const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({
			format: combine(
				timestamp(),
				colorize(),
				customFormat
			),
			level: devTools ? 'debug' : 'info'
		}),
		new winston.transports.DailyRotateFile({
			filename: 'electra-%DATE%.log',
			dirname: LOG_DIR,
			maxSize: '8m',
			maxFiles: '7d',
			format: combine(
				timestamp(),
				customFormat
			),
			level: 'debug'
		})
	]
});

export default logger.child({ process: 'main' });