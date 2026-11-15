import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseManagerService {
  readonly estiasiApp: FirebaseApp;
  readonly estiasiDb: Firestore;

  readonly hubApp: FirebaseApp;
  readonly hubDb: Firestore;

  constructor() {
    // 1. Initialize Estiasi
    this.estiasiApp = getApps().some(a => a.name === 'estiasi')
      ? getApp('estiasi')
      : initializeApp(environment.firebase.estiasi, 'estiasi');
    this.estiasiDb = getFirestore(this.estiasiApp);

    // 2. Initialize Maranth Hub (Market POS)
    this.hubApp = getApps().some(a => a.name === 'hub')
      ? getApp('hub')
      : initializeApp(environment.firebase.hub, 'hub');
    this.hubDb = getFirestore(this.hubApp);
  }
}