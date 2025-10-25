import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButcheryLanding } from './butchery-landing';

describe('ButcheryLanding', () => {
  let component: ButcheryLanding;
  let fixture: ComponentFixture<ButcheryLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButcheryLanding]
    }).compileComponents();

    fixture = TestBed.createComponent(ButcheryLanding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
