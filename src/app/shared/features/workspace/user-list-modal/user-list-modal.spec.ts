import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserListModal } from './user-list-modal';

describe('UserListModal', () => {
  let component: UserListModal;
  let fixture: ComponentFixture<UserListModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserListModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
