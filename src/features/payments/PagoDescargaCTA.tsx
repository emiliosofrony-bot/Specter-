import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePagos, useIniciarPago } from '@/hooks/usePagos'
import { TARIFA_FIJA_B2C_COP } from '@/api/pagos'

const formatCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// Flujo B2C: tarifa fija por descarga. El pago queda 'pendiente' hasta que el
// webhook de Mercado Pago (Fase 4, backend con service role) lo confirme —
// el cliente nunca marca un pago como 'exitoso' (0005_rls.sql).
export function PagoDescargaCTA({ casoId }: { casoId: string }) {
  const { data: pagos } = usePagos()
  const iniciarPago = useIniciarPago()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pagoDelCaso = pagos?.find((pago) => pago.caso_id === casoId)

  async function handleIniciarPago() {
    setErrorMessage(null)
    try {
      const { checkoutUrl } = await iniciarPago.mutateAsync(casoId)
      window.location.href = checkoutUrl
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo iniciar el pago.')
    }
  }

  if (pagoDelCaso?.status === 'exitoso') {
    return (
      <p className="text-label-md text-surface-variant">
        Pago confirmado. Puedes descargar el documento cuando esté listo.
      </p>
    )
  }

  if (pagoDelCaso?.status === 'pendiente') {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-body-lg">Pago en proceso</CardTitle>
          <CardDescription>
            Estamos esperando la confirmación de Mercado Pago. Esto puede tardar unos segundos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-body-lg">Descarga tu documento</CardTitle>
        <CardDescription>Tarifa fija de {formatCOP.format(TARIFA_FIJA_B2C_COP)} por descarga.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button onClick={handleIniciarPago} disabled={iniciarPago.isPending}>
          {iniciarPago.isPending ? 'Redirigiendo…' : `Pagar ${formatCOP.format(TARIFA_FIJA_B2C_COP)}`}
        </Button>
        {errorMessage ? <p className="text-label-md text-error">{errorMessage}</p> : null}
      </CardContent>
    </Card>
  )
}
