import { TestBed } from '@angular/core/testing';

import { Pouchdb } from './pouchdb';

describe('Pouchdb', () => {
  let service: Pouchdb;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Pouchdb);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
