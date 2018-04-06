"use strict";

const { hash, Set } = require('immutable');
const base = require('airtable').base('appI5wbax01HyDamh');

class Member {
  constructor(record) {
    this.id = record.get('Beacon ID');
    this.firstName = record.get('First Name');
  }

  equals(other) {
    return this.id === other.id;
  }

  hashCode() {
    return hash(this.id);
  }
}

const RELOAD_INTERVAL_MSEC = 10 * 60 * 1000;
const MAX_MSEC_SINCE_LAST_SEEN = 5 * 60 * 1000;

class MemberPresence {
  constructor() {
    this.memberMap = new Map();
    this.lastSeenTimeMap = new Map();
    this.reload();
    setInterval(this.reload.bind(this), RELOAD_INTERVAL_MSEC);
  }

  addScanEvent(id) {
    if (!this.memberMap.has(id)) {
      return;
    }
    this.lastSeenTimeMap.set(id, new Date());
  }

  getPresentMembers() {
    const limit = new Date() - MAX_MSEC_SINCE_LAST_SEEN;
    const members = [...this.lastSeenTimeMap.entries()]
      .filter(([id, time]) => time > limit) 
      .map(([id, time]) => this.memberMap.get(id));
    return Set(members);
  }

  reload() {
    base('People').select({
      fields: ['First Name', 'Beacon ID'],
      filterByFormula: "NOT({Beacon ID} = '')"
    }).firstPage((err, records) => {
      if (err) {
        return console.error('Failed to load from Airtable: ' + err);
      }
      this.memberMap =
        new Map(records
          .filter(r => r.get('Beacon ID'))
          .map(r => [r.get('Beacon ID'), new Member(r)]));
      console.info('Member data loaded:', this.memberMap);
    });
  }
}

exports.singleton = new MemberPresence();
