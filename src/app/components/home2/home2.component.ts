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
    'Límites y libertad',
    'Sueños de atracción',
    'Vínculos con Power',
    'Tu dinero, tus reglas',
  ];

  talleresAdultos = [
    'Batallas silenciosas',
    'Lleno de sueños, lleno de deudas',
    'El desafío del carácter',
    'Redefiniendo el amor',
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
      formData.tallerSabado,
      formData.edad
    );

  }




  archivoSeleccionado: File | null = null;

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
    }
  }
  async generarImagenConQR(
    cedula: string,
    nombres: string,
    apellidos: string,
    tallerV: string,
    tallerS: string,
    edad: string
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 780;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cargar logos
    const logo1 = new Image();
    logo1.src = 'assets/logo.png';
    logo1.crossOrigin = 'anonymous';

    const logo2 = new Image();
    logo2.src = 'assets/red.png';
    logo2.crossOrigin = 'anonymous';

    await new Promise((resolve) => {
      let loaded = 0;
      const check = () => {
        loaded++;
        if (loaded === 2) resolve(true);
      };
      logo1.onload = check;
      logo2.onload = check;
    });

    // Logos más grandes (100x100)
    ctx.drawImage(logo1, 40, 30, 100, 100);
    ctx.drawImage(logo2, canvas.width - 140, 30, 100, 100);

    // Nombre completo centrado
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${nombres}`, canvas.width / 2, 160);
    ctx.fillText(`${apellidos}`, canvas.width / 2, 210);

    // Generar QR antes del bloque amarillo y talleres
    const qrDataUrl = await QRCode.toDataURL(cedula);
    const qrImg = new Image();
    qrImg.src = qrDataUrl;

    await new Promise((resolve) => {
      qrImg.onload = () => {
        // QR más grande (300x300)
        ctx.drawImage(qrImg, canvas.width / 2 - 150, 250, 300, 300);
        resolve(true);
      };
    });

    /* ─────────────── BLOQUE ROJO CON HORARIOS ─────────────── */

// 1. Prepara las líneas según la edad
    const adolescentes = ['12 a 14 años', '15 a 17 años'];
    const lineas = adolescentes.includes(edad)
      ? [
        'Esta entrada es válida: el Jueves 10 de Julio a partir de las 19H00,',
        'el Viernes 11 de Julio entre las 15H00 y 19H00,',
        'el Sábado 12 de Julio entre las 09H30 y las 12H00'
      ]
      : [
        'Esta entrada es válida: el Jueves 10 de Julio a partir de las 19H00,',
        'el Viernes 11 de Julio entre las 19H00 y 22H00,',
        'el Sábado 12 de Julio entre las 15H00 y las 21H00'
      ];

// 2. Configura fuente para medir
    ctx.font = '18px Arial';
    const lineHeight   = 22;   // misma separación que usarás
    const paddingX     = 20;   // margen horizontal interno
    const paddingY     = 10;   // margen vertical interno

// 3. Calcula ancho máximo del texto
    const maxLineWidth = Math.max(...lineas.map(l => ctx.measureText(l).width));

// 4. Calcula dimensiones y posición del rectángulo
    const rectWidth  = maxLineWidth + paddingX * 2;
    const rectHeight = lineHeight * lineas.length + paddingY * 2;
    const rectX      = (canvas.width - rectWidth) / 2;   // centrado
    const rectY      = 580;                              // donde lo tenías

// 5. Dibuja el rectángulo rojo
    ctx.fillStyle = '#ffa9a9';
    drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, 12); // 12 = radio de borde


// 6. Dibuja las líneas dentro del rectángulo
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }


    let yTexto = rectY + (rectHeight - lineHeight * lineas.length) / 2 + lineHeight - 4; // primera línea
    lineas.forEach(l => {
      ctx.fillText(l, canvas.width / 2, yTexto);
      yTexto += lineHeight;
    });

    // Mostrar talleres ajustando texto
    ctx.textAlign = 'left';
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, fontSize: number) => {
      ctx.font = `${fontSize}px Arial`;
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
      return y + lineHeight;
    };

    ctx.fillStyle = '#000000';
    let y = yTexto + 20;
    y = wrapText(`Taller Viernes: ${tallerV}`, 60, y, 480, 25, 18);
    wrapText(`Taller Sábado: ${tallerS}`, 60, y, 480, 25, 18);

    // Guardar y subir
    const dataUrl = canvas.toDataURL('image/png');
    this.imagenGeneradaURL = dataUrl;
    this.descargaLista = true;

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
