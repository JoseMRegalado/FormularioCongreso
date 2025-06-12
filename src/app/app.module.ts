import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RouterLink, RouterModule, RouterOutlet, Routes} from "@angular/router";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {environment} from "../environments/environment";
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import {HomeComponent} from "./components/home/home.component";
import { Home2Component } from './components/home2/home2.component';
import { HeaderComponent } from './components/header/header.component';
import { ParticipantesTableComponent } from './components/participantes-table/participantes-table.component';
import { SafeUrlPipe } from './safe-url.pipe';


const appRoutes: Routes = [
  //{path: 'home', component: HomeComponent},
  {path: '', component: Home2Component},
  {path: 'home2', component: Home2Component},
  {path: 'abcd', component: ParticipantesTableComponent},
];
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    Home2Component,
    HeaderComponent,
    ParticipantesTableComponent,
    SafeUrlPipe
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    RouterOutlet,
    RouterModule.forRoot(appRoutes),
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
