const logger = {
    info: (message: string, context?: any) => {
        console.log(`[INFO] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error?.message || error || '');
        if (error?.stack) console.error(error.stack);
    },
    warn: (message: string, context?: any) => {
        console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
};

export default logger;
