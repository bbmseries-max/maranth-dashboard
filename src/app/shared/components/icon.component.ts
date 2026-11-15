import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg 
      [attr.width]="size()" 
      [attr.height]="size()" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      [class]="class()">
      @switch (name()) {
        @case ('radar') {
          <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M16.24 7.76A6 6 0 0 0 7.76 16.24M12 2v20M2 12h20"/>
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        }
        @case ('check') {
          <polyline points="20 6 9 17 4 12"/>
        }
        @case ('credit-card') {
          <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        }
      }
    </svg>
  `,
  styles: [`:host { display: inline-flex; align-items: center; justify-content: center; }`]
})
export class IconComponent {
  name = input.required<string>();
  size = input<number>(18);
  class = input<string>('');
}