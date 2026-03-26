import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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

        <h1 className="text-3xl font-display font-bold mb-2">Términos y Condiciones</h1>
        <p className="text-muted-foreground text-sm mb-8">Última actualización: marzo de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">

          <section>
            <h2 className="text-xl font-bold mb-2">1. Aceptación de los términos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Al utilizar KioscoPOS, usted acepta cumplir con estos Términos y Condiciones. Si no está de acuerdo con alguno de los términos aquí descritos, le pedimos que no utilice el sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Descripción del servicio</h2>
            <p className="text-muted-foreground leading-relaxed">
              KioscoPOS es un sistema de punto de venta (POS) diseñado para kioscos y minimarkets. Incluye funcionalidades de gestión de ventas, inventario, gastos, reportes financieros, impresión de tickets e integración con medios de pago. El sistema se ofrece bajo modalidad de suscripción mensual o plan total.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Planes y suscripción</h2>
            <p className="text-muted-foreground leading-relaxed">
              KioscoPOS ofrece tres tipos de plan:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
              <li><strong>Plan Demo:</strong> Período de prueba gratuito de 30 días con acceso completo al sistema.</li>
              <li><strong>Plan Mensual:</strong> Acceso al sistema mediante pago mensual. El incumplimiento del pago puede resultar en la suspensión del servicio.</li>
              <li><strong>Plan Total:</strong> Pago único que otorga acceso permanente al sistema sin renovación mensual.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Los precios varían según el país y se informan al momento de la suscripción. Los pagos no son reembolsables salvo disposición legal en contrario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Uso aceptable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Usted se compromete a:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
              <li>Utilizar KioscoPOS únicamente para fines comerciales legítimos.</li>
              <li>No intentar acceder a funciones del sistema de manera no autorizada.</li>
              <li>No compartir sus credenciales de acceso con personas no autorizadas.</li>
              <li>No reproducir, distribuir ni sublicenciar el software sin autorización expresa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Propiedad intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              KioscoPOS y todos sus componentes, incluyendo código fuente, diseño, logotipos y documentación, son propiedad exclusiva de Techpro Computación. Queda prohibida cualquier reproducción o uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Limitación de responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Techpro Computación no se hace responsable por pérdidas de datos derivadas de un uso inadecuado del sistema, cortes de energía, fallas de hardware o cualquier factor externo al software. Se recomienda realizar copias de seguridad periódicas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Techpro Computación se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán notificados a través de los canales habituales de comunicación. El uso continuado del sistema implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">8. Ley aplicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será sometida a la jurisdicción de los tribunales ordinarios competentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">9. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para consultas sobre estos términos, contáctenos mediante WhatsApp o a través de los canales de soporte de Techpro Computación.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2026 Techpro Computación · Todos los derechos reservados ·{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Política de Privacidad</Link>
        </div>
      </div>
    </div>
  );
}
