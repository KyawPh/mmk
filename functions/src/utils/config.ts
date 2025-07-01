import { config, isProduction } from '../config';

// Helper class to access config with getEnvVar method
export class ConfigHelper {
  getEnvVar(path: string, defaultValue: string = ''): string {
    const keys = path.split('.');
    let value: any = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    if (value === null || value === undefined) {
      return defaultValue;
    }

    return String(value);
  }

  get(path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let value: any = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value ?? defaultValue;
  }
}

export const configHelper = new ConfigHelper();
export { config, isProduction };
