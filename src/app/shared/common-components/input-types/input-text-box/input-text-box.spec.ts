import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputTextBox } from './input-text-box';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

describe('InputTextBox', () => {
  let component: InputTextBox;
  let fixture: ComponentFixture<InputTextBox>;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        InputTextBox,
        ReactiveFormsModule,
        MatInputModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatIconModule,
        MatButtonModule,
        NgClass
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InputTextBox);
    component = fixture.componentInstance;

    const fb = new FormBuilder();
    form = fb.group({
      testControl: ['']
    });

    (component as any).frmGroup = () => form;
    (component as any).controlName = () => 'testControl';
    (component as any).label = () => 'Test Label';

    fixture.detectChanges();
  });

  // ---- 1. Component Creation ---- //
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---- 2. Form control binding ---- //
  it('should bind to the form control', () => {
    expect(component?.frmGroup()?.get('testControl')).toBeTruthy();
  });

  // ---- 3. Validators ---- //
//   it('should apply required validator', () => {
//     component.isRequired.set(true);
//     component.updateValidators();
//     const control = form.get('testControl');
//     control!.setValue('');
//     expect(control!.valid).toBeFalse();
//     control!.setValue('Valid');
//     expect(control!.valid).toBeTrue();
//   });

  it('should apply minLength and maxLength validators', () => {
    (component as any).minLength = () => 3;
    (component as any).maxLength = () => 5;
    component.updateValidators();
    const control = form.get('testControl');
    control!.setValue('ab');
    expect(control!.valid).toBeFalse();
    control!.setValue('abc');
    expect(control!.valid).toBeTrue();
    control!.setValue('abcdef');
    expect(control!.valid).toBeFalse();
  });

  it('should prevent special characters when isAllowSpecialChars is false', () => {
    (component as any).isAllowSpecialChars = () => false;
    const event = { key: '@', preventDefault: jasmine.createSpy(), stopPropagation: jasmine.createSpy() } as any;
    component.onKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  // ---- 4. F8 key event ---- //
  it('should emit onF8 when F8 key pressed', () => {
    spyOn(component.onF8, 'emit');
    const event = { key: 'F8', preventDefault: jasmine.createSpy(), stopPropagation: jasmine.createSpy() } as any;
    component.onKeyDown(event);
    expect(component.onF8.emit).toHaveBeenCalled();
  });

  // ---- 5. Value changed events ---- //
  it('should emit valueChanged and onChanged on input', () => {
    spyOn(component.valueChanged, 'emit');
    spyOn(component.onChanged, 'emit');
    const event = { target: { value: 'Hello' } } as any;
    component.onInput(event);
    expect(component.valueChanged.emit).toHaveBeenCalledWith('Hello');
    expect(component.onChanged.emit).toHaveBeenCalledWith('Hello');
  });

  it('should emit onChanged and onBlurred on blur', () => {
    spyOn(component.onChanged, 'emit');
    spyOn(component.onBlurred, 'emit');
    form.get('testControl')!.setValue('Test Blur');
    component.onBlur();
    expect(component.onChanged.emit).toHaveBeenCalledWith('Test Blur');
    expect(component.onBlurred.emit).toHaveBeenCalledWith('Test Blur');
  });

  // ---- 6. clearInput() ---- //
  it('should clear input value', () => {
    spyOn(component.valueChanged, 'emit');
    spyOn(component.onChanged, 'emit');
    form.get('testControl')!.setValue('To Clear');
    component.clearInput();
    expect(form.get('testControl')!.value).toBe('');
    expect(component.valueChanged.emit).toHaveBeenCalledWith('');
    expect(component.onChanged.emit).toHaveBeenCalledWith('');
  });
});
