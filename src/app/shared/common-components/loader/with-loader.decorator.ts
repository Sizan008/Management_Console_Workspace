// with-loader.decorator.ts

import { LoaderService } from "../../services/loader.service";


export function WithLoader<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      args.find(arg => arg instanceof LoaderService);
    }
  };
}

