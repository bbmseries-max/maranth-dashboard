import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp, FirebaseOptions } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

const firebaseConfig = (environment.firebase as any)?.estiasi || (environment.firebase as any)?.hub || environment.firebase;

export const appConfig: ApplicationConfig = {
  providers: [
    // Pure Zoneless Change Detection:
    provideZonelessChangeDetection(),

    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(firebaseConfig as FirebaseOptions)),
    provideFirestore(() => getFirestore())
  ]
};