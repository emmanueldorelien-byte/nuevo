import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-background p-4 sm:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-display font-bold mb-2">Política de Privacidad</h1>
        <p className="text-muted-foreground text-sm mb-8">Última actualización: marzo de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">

          <section>
            <h2 className="text-xl font-bold mb-2">1. Información que recopilamos</h2>
            <p className="text-muted-foreground leading-relaxed">
              KioscoPOS recopila únicamente la información necesaria para el correcto funcionamiento del sistema de punto de venta. Esto incluye: datos de productos, transacciones de venta, gastos, stock e información básica del negocio (nombre, dirección, teléfono, email). No recopilamos datos personales de clientes finales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Uso de la información</h2>
            <p className="text-muted-foreground leading-relaxed">
              La información almacenada en KioscoPOS se utiliza exclusivamente para:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
              <li>Registrar y gestionar ventas del negocio.</li>
              <li>Controlar el inventario de productos.</li>
              <li>Generar reportes financieros para el propietario.</li>
              <li>Enviar notificaciones de suscripción vía WhatsApp (solo con su consentimiento).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Almacenamiento de datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todos los datos del negocio se almacenan en una base de datos segura alojada en servidores protegidos. La foto del local y configuraciones se guardan de forma cifrada. No compartimos ni vendemos sus datos a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Integración con MercadoPago</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si habilita el módulo de MercadoPago, sus credenciales de acceso (Access Token) se almacenan de forma segura y se utilizan únicamente para generar cobros QR. No accedemos a su cuenta ni realizamos operaciones no autorizadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Cookies y rastreo</h2>
            <p className="text-muted-foreground leading-relaxed">
              KioscoPOS no utiliza cookies de rastreo ni servicios de analítica de terceros. El sistema funciona de forma local en su dispositivo y no monitorea su comportamiento de navegación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Seguridad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de seguridad técnicas y organizativas para proteger su información, incluyendo contraseñas de administrador y de caja, y acceso restringido a funciones sensibles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Sus derechos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Usted tiene derecho a acceder, rectificar o eliminar los datos almacenados en su instancia de KioscoPOS en cualquier momento. Para ejercer estos derechos, contacte a nuestro equipo de soporte vía WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">8. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para consultas sobre privacidad, puede contactarnos mediante WhatsApp al número indicado en su contrato de suscripción o escribirnos a través de los canales de soporte de Techpro Computación.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 Techpro Computación · Todos los derechos reservados ·{" "}
          <Link href="/terms" className="underline hover:text-foreground">Términos y Condiciones</Link>
        </div>
      </div>
    </div>
  );
}
