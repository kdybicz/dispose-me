export default class Logger {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  static trace(message?: any, ...optionalParams: any[]): void {
    if (Logger.logForLevel(5)) {
      console.trace(message, optionalParams);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  static debug(message?: any, ...optionalParams: any[]): void {
    if (Logger.logForLevel(4)) {
      console.debug(message, optionalParams);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  static info(message?: any, ...optionalParams: any[]): void {
    if (Logger.logForLevel(3)) {
      console.info(message, optionalParams);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  static warn(message?: any, ...optionalParams: any[]): void {
    if (Logger.logForLevel(2)) {
      console.warn(message, optionalParams);
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  static error(message?: any, ...optionalParams: any[]): void {
    if (Logger.logForLevel(1)) {
      console.error(message, optionalParams);
    }
  }

  private static logForLevel(level: number): boolean {
    return Number.parseInt(process.env.LOG_LEVEL ?? '1', 10) >= level;
  }
}
