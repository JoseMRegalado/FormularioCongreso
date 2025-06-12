import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

interface Registro {
  nombres: string;
  apellidos: string;
  cedula: string;
  celular: string;          // o “celular”, ajusta según tu colección
  tallerViernes: string;
  tallerSabado: string;
  comprobante: string;       // así lo grabaste en el flujo de inscripción
}

@Component({
  selector: 'app-participantes-table',
  templateUrl: './participantes-table.component.html',
  styleUrls: ['./participantes-table.component.css']
})
export class ParticipantesTableComponent implements OnInit {
  registros: Registro[] = [];
  registrosFiltrados: Registro[] = [];
  registrosPagina: Registro[] = [];

  paginaActual = 1;
  registrosPorPagina = 10;
  terminoBusqueda = '';

  constructor(private afs: AngularFirestore) {}

  ngOnInit(): void {
    this.afs.collection<Registro>('Congreso2025')
      .valueChanges({ idField: 'id' })      // 👈 mismo efecto que collectionData
      .subscribe(data => {
        this.registros = data;
        this.aplicarFiltroYPaginacion();
      });
  }

  aplicarFiltroYPaginacion(): void {
    const t = this.terminoBusqueda.toLowerCase();
    this.registrosFiltrados = this.registros.filter(r =>
      `${r.nombres} ${r.apellidos}`.toLowerCase().includes(t) ||
      r.cedula.toLowerCase().includes(t)
    );
    this.actualizarPagina();
  }

  actualizarPagina(): void {
    const ini = (this.paginaActual - 1) * this.registrosPorPagina;
    this.registrosPagina = this.registrosFiltrados.slice(ini, ini + this.registrosPorPagina);
  }

  cambiarPagina(n: number): void {
    this.paginaActual = n;
    this.actualizarPagina();
  }

  totalPaginas(): number {
    return Math.ceil(this.registrosFiltrados.length / this.registrosPorPagina);
  }
}
