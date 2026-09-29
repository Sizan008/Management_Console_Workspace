import { FormBuilder, FormGroup } from '@angular/forms';

export function buildFormGroup<T extends object>(fb: FormBuilder, model: T): FormGroup {
  const group: any = {};

  Object.keys(model).forEach(key => {
    const value = (model as any)[key];
    group[key] = [value ?? null];
  });

  return fb.group(group);
}
