import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp, FirebaseOptions } from '@angular/fire/app';
import { initializeFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

const firebaseConfig = (environment.firebase as any)?.hub || environment.firebase;

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(firebaseConfig as FirebaseOptions)),
    provideFirestore(() => initializeFirestore(initializeApp(firebaseConfig as FirebaseOptions), {
      experimentalAutoDetectLongPolling: true
    })),
    provideAuth(() => getAuth())
  ]
};