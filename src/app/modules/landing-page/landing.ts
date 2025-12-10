
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [MatCardModule, HasPermissionDirective],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class Landing {
  constructor(private router: Router) { }

  public navigate(area: string): void {
    if (area === 'butchery') this.router.navigate(['/butchery']);
    else if (area === 'office') this.router.navigate(['/office']);
    else if (area === 'farming') this.router.navigate(['/farming']);
  }
}
