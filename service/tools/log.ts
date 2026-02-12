/** biome-ignore-all lint/suspicious/noConsole: This is a logger utility and only it can use console directly */
export default class Logger {
  static trace(message: string, ...optionalParams: unknown[]): void {
    if (Logger.logForLevel(5)) {
      console.trace(message, ...optionalParams);
    }
  }

  static debug(message: string, ...optionalParams: unknown[]): void {
    if (Logger.logForLevel(4)) {
      console.debug(message, ...optionalParams);
    }
  }

  static info(message: string, ...optionalParams: unknown[]): void {
    if (Logger.logForLevel(3)) {
      console.info(message, ...optionalParams);
    }
  }

  static warn(message: string, ...optionalParams: unknown[]): void {
    if (Logger.logForLevel(2)) {
      console.warn(message, ...optionalParams);
    }
  }

  static error(message: string, ...optionalParams: unknown[]): void {
    if (Logger.logForLevel(1)) {
      console.error(message, ...optionalParams);
    }
  }

  private static logForLevel(level: number): boolean {
    return Number.parseInt(process.env.LOG_LEVEL ?? '1', 10) >= level;
  }
}
