import { useState, type FormEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useInvitarAbogado } from '@/hooks/useInvitaciones'
import type { InvitacionCreada } from '@/api/invitaciones'

export function InvitarAbogadoForm() {
  const [email, setEmail] = useState('')
  const [creada, setCreada] = useState<InvitacionCreada | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const invitar = useInvitarAbogado()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage(null)
    setCreada(null)
    setCopiado(false)
    try {
      const result = await invitar.mutateAsync(email)
      setCreada(result)
      setEmail('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo crear la invitación.')
    }
  }

  async function handleCopiar() {
    if (!creada) return
    await navigator.clipboard.writeText(creada.invite_url)
    setCopiado(true)
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-body-lg">Invitar a un abogado</CardTitle>
        <CardDescription>
          Se unirá a tu firma con rol de abogado premium. El enlace expira en 7 días y solo funciona
          con el correo invitado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="invite_email">Correo</Label>
            <Input
              id="invite_email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={invitar.isPending}>
            {invitar.isPending ? 'Creando…' : 'Invitar'}
          </Button>
        </form>

        {errorMessage ? <p className="text-label-md text-error">{errorMessage}</p> : null}

        {creada ? (
          <div className="flex flex-col gap-2 rounded-lg border border-copper/40 bg-copper/5 p-3">
            <p className="text-label-md text-surface">
              Enlace de invitación para {creada.email}. Se muestra una sola vez — cópialo ahora y
              compártelo por un canal seguro.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-canvas px-2 py-1.5 text-label-sm text-surface-variant">
                {creada.invite_url}
              </code>
              <Button type="button" variant="secondary" size="sm" onClick={handleCopiar}>
                {copiado ? <Check className="h-4 w-4" strokeWidth={1.5} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
