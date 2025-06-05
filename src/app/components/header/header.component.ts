import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  isLoggedIn: boolean = false;
  userEmail: string | null = null; // Para almacenar el correo del usuario

  constructor(private router: Router) {}


  menuOpen = false;
  botonOpen: boolean = false;

  toggleMenu() {
    this.botonOpen = !this.botonOpen;
  }

  toggleNav() {
    this.menuOpen = !this.menuOpen;
  }
}
