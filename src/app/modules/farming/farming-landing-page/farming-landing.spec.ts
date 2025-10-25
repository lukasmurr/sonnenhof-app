import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FarmingLanding } from './farming-landing';

describe('FarmingLanding', () => {
  let component: FarmingLanding;
  let fixture: ComponentFixture<FarmingLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmingLanding]
    }).compileComponents();

    fixture = TestBed.createComponent(FarmingLanding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
