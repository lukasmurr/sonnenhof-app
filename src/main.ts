import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

(window as any).global = window;
registerLocaleData(localeDe);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
