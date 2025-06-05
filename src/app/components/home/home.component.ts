import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  form: FormGroup;
  enviado = false;
  edadSeleccionada = '';
  talleresDisponiblesViernes: string[] = [];
  talleresDisponiblesSabado: string[] = [];
  maximosPorTaller = 2;

  cargandoTalleres = false;


  talleresAdolescentes = [
    'TALLER 1 - LÍMITES Y LIBERTAD',
    'TALLER 2 - SUEÑOS DE ATRACCIÓN',
    'TALLER 3 - VÍNCULOS CON POWER',
    'TALLER 4 - TU DINERO, TUS REGLAS',
  ];
  talleresAdultos = [
    'TALLER 1 - BATALLAS SILENCIOSAS',
    'TALLER 2 - LLENO DE SUEÑOS, LLENO DE DEUDAS',
    'TALLER 3 - EL DESAFIO DEL CARÁCTER',
    'TALLER 4 - REDEFINIENDO EL AMOR',
  ];

  constructor(private fb: FormBuilder, private afs: AngularFirestore) {
    this.form = this.fb.group({
      cedula: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      celular: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      direccion: ['', Validators.required],
      genero: ['', Validators.required],
      edad: ['', Validators.required],
      tallerViernes: ['', Validators.required],
      tallerSabado: ['', Validators.required],
      iglesia: ['', Validators.required],
      hogar: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.form.get('edad')?.valueChanges.subscribe((edad) => {
      this.form.patchValue({ tallerViernes: '', tallerSabado: '' });
      this.edadSeleccionada = edad;
      this.validarCuposYActualizarOpciones();
    });

    this.form.get('tallerViernes')?.valueChanges.subscribe(() => {
      this.actualizarTalleresSabadoDesdeCambio();
    });

    // Verificar si ya llenó el formulario
    this.form.get('cedula')?.valueChanges.subscribe(cedula => {
      if (cedula?.length > 5) {
        this.verificarRegistroExistente(cedula);
      }
    });
  }


  async validarCuposYActualizarOpciones() {

    this.cargandoTalleres = true; // empieza la carga

    const edad = this.form.get('edad')?.value;
    const talleres = this.getTalleresPorEdad(edad);
    const viernesDisponibles: string[] = [];
    const sabadoDisponibles: string[] = [];

    for (const taller of talleres) {
      const viernesCount = await this.afs.collection('Congreso2025', ref =>
        ref.where('tallerViernes', '==', taller)
      ).get().toPromise();

      const sabadoCount = await this.afs.collection('Congreso2025', ref =>
        ref.where('tallerSabado', '==', taller)
      ).get().toPromise();

      if ((viernesCount?.size ?? 0) < this.maximosPorTaller) {
        viernesDisponibles.push(taller);
      }

      if ((sabadoCount?.size ?? 0) < this.maximosPorTaller) {
        sabadoDisponibles.push(taller);
      }
    }

    this.talleresDisponiblesViernes = viernesDisponibles;

    const tallerViernesSeleccionado = this.form.get('tallerViernes')?.value;

    // Eliminar de sábado el taller seleccionado el viernes
    this.talleresDisponiblesSabado = sabadoDisponibles.filter(t => t !== tallerViernesSeleccionado);
    this.cargandoTalleres = false; // termina la carga
  }

  actualizarTalleresSabadoDesdeCambio() {
    const tallerViernesSeleccionado = this.form.get('tallerViernes')?.value;

    // Recalcular desde la lista base original con cupo
    const edad = this.form.get('edad')?.value;
    const talleresBase = this.getTalleresPorEdad(edad);

    this.afs.collection('Congreso2025').get().toPromise().then(snapshot => {
      const tallerCounts: Record<string, { viernes: number, sabado: number }> = {};

      talleresBase.forEach(taller => {
        tallerCounts[taller] = { viernes: 0, sabado: 0 };
      });

      snapshot?.forEach(doc => {
        const data: any = doc.data();
        if (tallerCounts[data.tallerViernes]) {
          tallerCounts[data.tallerViernes].viernes++;
        }
        if (tallerCounts[data.tallerSabado]) {
          tallerCounts[data.tallerSabado].sabado++;
        }
      });

      // Calcular nueva lista para sábado (que tenga cupo y no sea el mismo de viernes)
      this.talleresDisponiblesSabado = talleresBase.filter(taller =>
        taller !== tallerViernesSeleccionado &&
        (tallerCounts[taller]?.sabado ?? 0) < this.maximosPorTaller
      );

      // Limpiar selección actual
      this.form.patchValue({ tallerSabado: '' });
    });
  }



  getTalleresPorEdad(edad: string): string[] {
    const adolescentes = ['12 a 14 años', '15 a 17 años'];
    return adolescentes.includes(edad) ? this.talleresAdolescentes : this.talleresAdultos;
  }

  async verificarRegistroExistente(cedula: string) {
    const doc = await this.afs.collection('Congreso2025').doc(cedula).get().toPromise();
    // @ts-ignore
    if (doc.exists) {
      this.enviado = true;
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;

    const cedula = this.form.value.cedula;
    const doc = await this.afs.collection('Congreso2025').doc(cedula).get().toPromise();

    // @ts-ignore
    if (!doc.exists) {
      await this.afs.collection('Congreso2025').doc(cedula).set(this.form.value);
      this.enviado = true;
    } else {
      this.enviado = true;
    }
  }
}
