import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceModal } from './workspace-modal';

describe('WorkspaceModal', () => {
  let component: WorkspaceModal;
  let fixture: ComponentFixture<WorkspaceModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
