import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorizonRadarComponent } from './horizon-radar';

describe('HorizonRadar', () => {
  let component: HorizonRadarComponent;
  let fixture: ComponentFixture<HorizonRadarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizonRadarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HorizonRadarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
