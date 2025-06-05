import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators';
import * as QRCode from 'qrcode';



@Component({
  selector: 'app-home2',
  templateUrl: './home2.component.html',
  styleUrls: ['./home2.component.css']
})
export class Home2Component implements OnInit {
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


  imagenGeneradaURL: string = '';
  descargaLista: boolean = false;

  enviando: boolean = false;



  constructor(private fb: FormBuilder, private afs: AngularFirestore,
              private storage: AngularFireStorage) {
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

    this.form.get('cedula')?.valueChanges.subscribe(cedula => {
      if (cedula?.length > 5) {
        this.verificarRegistroExistente(cedula);
      }
    });
  }

  getTalleresPorDia(edad: string, dia: 'viernes' | 'sabado'): string[] {
    const adolescentes = ['12 a 14 años', '15 a 17 años'];
    const adultos = ['18 a 25 años', '25 años en adelante'];

    if (adolescentes.includes(edad)) {
      return dia === 'viernes' ? this.talleresAdolescentes : this.talleresAdultos;
    } else if (adultos.includes(edad)) {
      return dia === 'viernes' ? this.talleresAdultos : this.talleresAdolescentes;
    }
    return [];
  }

  async validarCuposYActualizarOpciones() {
    this.cargandoTalleres = true;
    const edad = this.form.get('edad')?.value;

    const viernesBase = this.getTalleresPorDia(edad, 'viernes');
    const sabadoBase = this.getTalleresPorDia(edad, 'sabado');

    const viernesDisponibles: string[] = [];
    const sabadoDisponibles: string[] = [];

    for (const taller of viernesBase) {
      const viernesCount = await this.afs.collection('Congreso2025', ref =>
        ref.where('tallerViernes', '==', taller)
      ).get().toPromise();

      if ((viernesCount?.size ?? 0) < this.maximosPorTaller) {
        viernesDisponibles.push(taller);
      }
    }

    for (const taller of sabadoBase) {
      const sabadoCount = await this.afs.collection('Congreso2025', ref =>
        ref.where('tallerSabado', '==', taller)
      ).get().toPromise();

      if ((sabadoCount?.size ?? 0) < this.maximosPorTaller) {
        sabadoDisponibles.push(taller);
      }
    }

    this.talleresDisponiblesViernes = viernesDisponibles;

    const tallerViernesSeleccionado = this.form.get('tallerViernes')?.value;
    this.talleresDisponiblesSabado = sabadoDisponibles.filter(t => t !== tallerViernesSeleccionado);

    this.cargandoTalleres = false;
  }

  actualizarTalleresSabadoDesdeCambio() {
    const edad = this.form.get('edad')?.value;
    const tallerViernesSeleccionado = this.form.get('tallerViernes')?.value;
    const sabadoBase = this.getTalleresPorDia(edad, 'sabado');

    this.afs.collection('Congreso2025').get().toPromise().then(snapshot => {
      const counts: Record<string, number> = {};
      sabadoBase.forEach(taller => (counts[taller] = 0));

      snapshot?.forEach(doc => {
        const data: any = doc.data();
        if (counts[data.tallerSabado] !== undefined) {
          counts[data.tallerSabado]++;
        }
      });

      this.talleresDisponiblesSabado = sabadoBase.filter(taller =>
        taller !== tallerViernesSeleccionado &&
        (counts[taller] ?? 0) < this.maximosPorTaller
      );

      this.form.patchValue({ tallerSabado: '' });
    });
  }

  async verificarRegistroExistente(cedula: string) {
    const doc = await this.afs.collection('Congreso2025').doc(cedula).get().toPromise();
    // @ts-ignore
    if (doc.exists) {
      this.enviado = true;
    }
  }

  async onSubmit() {
    if (this.form.invalid || !this.archivoSeleccionado) {
      alert('Complete todos los campos y seleccione un archivo.');
      return;
    }

    this.enviando = true;

    const cedula = this.form.value.cedula;
    const formData = this.form.value;
    const file = this.archivoSeleccionado;
    const filePath = `comprobantes/${cedula}/${file.name}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file);

    task.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(async (url) => {
          const dataConComprobante = { ...formData, comprobante: url };

          try {
            await this.afs.collection('Congreso2025').doc(cedula).set(dataConComprobante);
            this.enviado = true;
            console.log('Formulario y archivo guardados con éxito.');
          } catch (error) {
            console.error('Error al guardar los datos:', error);
          } finally {
            this.enviando = false;
          }
        });
      })
    ).subscribe();
    await this.generarImagenConQR(
      formData.cedula,
      formData.nombres,
      formData.apellidos,
      formData.tallerViernes,
      formData.tallerSabado
    );

  }




  archivoSeleccionado: File | null = null;

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
    }
  }
  async generarImagenConQR(cedula: string, nombres: string, apellidos: string, tallerV: string, tallerS: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo blanco
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText(`Nombre: ${nombres} ${apellidos}`, 30, 50);
    ctx.fillText(`Taller Viernes: ${tallerV}`, 30, 100);
    ctx.fillText(`Taller Sábado: ${tallerS}`, 30, 150);

    // Generar QR como imagen y dibujar
    const qrDataUrl = await QRCode.toDataURL(cedula);
    const qrImg = new Image();
    qrImg.src = qrDataUrl;

    await new Promise(resolve => {
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 400, 50, 150, 150);
        resolve(true);
      };
    });

    const dataUrl = canvas.toDataURL('image/png');
    this.imagenGeneradaURL = dataUrl;
    this.descargaLista = true;

    // Subir imagen a Storage
    const filePath = `comprobantes/${cedula}/datos.png`;
    const fileRef = this.storage.ref(filePath);
    const blob = await (await fetch(dataUrl)).blob();

    await this.storage.upload(filePath, blob);
  }

  descargarImagen() {
    const a = document.createElement('a');
    a.href = this.imagenGeneradaURL;
    a.download = 'comprobante_congreso.png';
    a.click();
  }

}
