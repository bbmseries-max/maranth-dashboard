import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app'; // Or './app/app.component' depending on your filename

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error('Bootstrap Error:', err));