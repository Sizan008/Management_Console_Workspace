import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionModal } from './action-modal';

describe('ActionModal', () => {
  let component: ActionModal;
  let fixture: ComponentFixture<ActionModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
