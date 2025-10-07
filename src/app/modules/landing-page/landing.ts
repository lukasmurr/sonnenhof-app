import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class Landing {
  constructor(private router: Router) { }

  navigate(area: string) {
    if (area === 'butchery') this.router.navigate(['/butchery']);
    else if (area === 'office') this.router.navigate(['/office']);
    else if (area === 'farming') this.router.navigate(['/farming']);
  }
}
