import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StageModal } from './stage-modal';

describe('StageModal', () => {
  let component: StageModal;
  let fixture: ComponentFixture<StageModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StageModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StageModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
