import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Managenote } from './managenote';
describe('Managenote', () => {
  let component: Managenote;
  let fixture: ComponentFixture<Managenote>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Managenote]
    })
    .compileComponents();
    fixture = TestBed.createComponent(Managenote);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
