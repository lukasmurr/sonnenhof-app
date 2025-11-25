import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, MatCardModule],
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
