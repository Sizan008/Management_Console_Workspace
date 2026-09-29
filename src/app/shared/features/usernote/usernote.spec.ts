import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { Usernote } from './usernote';

describe('Usernote', () => {
  let component: Usernote;
  let fixture: ComponentFixture<Usernote>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usernote, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Usernote);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
