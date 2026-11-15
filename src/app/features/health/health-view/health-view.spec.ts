import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HealthViewComponent } from './health-view';

describe('HealthView', () => {
  let component: HealthViewComponent;
  let fixture: ComponentFixture<HealthViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
