import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionBoardComponent } from './action-board';

describe('ActionBoard', () => {
  let component: ActionBoardComponent;
  let fixture: ComponentFixture<ActionBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionBoardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
