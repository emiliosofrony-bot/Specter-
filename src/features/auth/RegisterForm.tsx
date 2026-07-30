import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { signUpWithPassword } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [searchParams] = useSearchParams()
  // Enlace de invitación B2B: /auth?invite=<token>&email=<correo>. El token
  // solo funciona con el correo al que se emitió (0008), por eso el campo se
  // prellena y queda bloqueado.
  const inviteToken = searchParams.get('invite') ?? undefined
  const invitedEmail = searchParams.get('email') ?? ''

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(invitedEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signUpWithPassword(email, password, fullName, inviteToken)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-body-md text-surface">
          Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de ingresar.
        </p>
        <Button variant="secondary" onClick={onSwitchToLogin}>
          Volver a inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {inviteToken ? (
        <p className="rounded-lg border border-copper/40 bg-copper/5 p-3 text-label-md text-surface">
          Te invitaron a unirte a una firma en Specter. Completa tus datos para aceptar.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register_email">Correo</Label>
        <Input
          id="register_email"
          type="email"
          autoComplete="email"
          required
          readOnly={Boolean(inviteToken && invitedEmail)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register_password">Contraseña</Label>
        <Input
          id="register_password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-label-md text-error">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? 'Creando cuenta…' : inviteToken ? 'Aceptar invitación' : 'Crear cuenta'}
      </Button>
      <button
        type="button"
        onClick={onSwitchToLogin}
        className="text-label-md text-surface-variant hover:text-surface"
      >
        ¿Ya tienes cuenta? Ingresa
      </button>
    </form>
  )
}
