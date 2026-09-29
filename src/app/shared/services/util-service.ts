import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  constructor() { }

  padString(
    original: string | null | undefined,
    pad: string,
    position: number,
    maxLength: number
  ): string {
    original = original ?? '';
    if (!pad) return original;

    if (original.length >= maxLength) {
      return original;
    }

    const remainingLength = maxLength - original.length;

    const repeatedPad = pad.repeat(Math.ceil(remainingLength / pad.length)).substring(0, remainingLength);

    let result: string;

    if (position <= 0) {
      result = repeatedPad + original;
    } else if (position >= original.length) {
      console.log(position + " " + original.length);

      result = original + repeatedPad;
    } else {
      result =
        original.substring(0, position) +
        repeatedPad +
        original.substring(position);
    }
    return result;
  }
}
