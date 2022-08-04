/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

export default class Logger {
  static trace(message?: any, ...optionalParams: any[]): void {
    if (this.logForLevel(5)) {
      console.trace(message, optionalParams);
    }
  }

  static debug(message?: any, ...optionalParams: any[]): void {
    if (this.logForLevel(4)) {
      console.debug(message, optionalParams);
    }
  }

  static info(message?: any, ...optionalParams: any[]): void {
    if (this.logForLevel(3)) {
      console.info(message, optionalParams);
    }
  }

  static warn(message?: any, ...optionalParams: any[]): void {
    if (this.logForLevel(2)) {
      console.warn(message, optionalParams);
    }
  }

  static error(message?: any, ...optionalParams: any[]): void {
    if (this.logForLevel(1)) {
      console.error(message, optionalParams);
    }
  }

  private static logForLevel(level: number): boolean {
    return parseInt(process.env.LOG_LEVEL ?? '1', 10) >= level;
  }
}
