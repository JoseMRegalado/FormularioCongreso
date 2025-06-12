import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantesTableComponent } from './participantes-table.component';

describe('ParticipantesTableComponent', () => {
  let component: ParticipantesTableComponent;
  let fixture: ComponentFixture<ParticipantesTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ParticipantesTableComponent]
    });
    fixture = TestBed.createComponent(ParticipantesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
