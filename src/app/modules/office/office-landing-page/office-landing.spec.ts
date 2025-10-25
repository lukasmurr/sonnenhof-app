import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfficeLanding } from './office-landing';

describe('OfficeLanding', () => {
  let component: OfficeLanding;
  let fixture: ComponentFixture<OfficeLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeLanding]
    }).compileComponents();

    fixture = TestBed.createComponent(OfficeLanding);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
