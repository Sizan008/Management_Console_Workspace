import { Injectable } from '@angular/core';
import { Type } from '@angular/core';


@Injectable({ providedIn: 'root' })
export class ComponentRegistry {

  private readonly map: Record<string, Type<any>> = {
  };

  resolve(selector: string): Type<any> | undefined {
    return this.map[selector];
  }
}
