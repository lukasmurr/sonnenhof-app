
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [MatCardModule, MatIconModule, HasPermissionDirective],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class Landing {
  constructor(private router: Router) { }

  public navigate(area: string): void {
    if (area === 'butchery') this.router.navigate(['/butchery']);
    else if (area === 'production-plan') this.router.navigate(['/butchery/production']);
    else if (area === 'office') this.router.navigate(['/office']);
    else if (area === 'farming') this.router.navigate(['/farming']);
  }
}
