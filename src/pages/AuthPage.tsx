import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/features/auth/LoginForm'
import { RegisterForm } from '@/features/auth/RegisterForm'

export function AuthPage() {
  const [searchParams] = useSearchParams()
  // Quien llega por un enlace de invitación necesita registrarse, no ingresar.
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.has('invite') ? 'register' : 'login',
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-margin-mobile">
      <Card className="w-full max-w-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-headline-lg-mobile">Specter</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Ingresa a tu workspace legal.' : 'Crea tu cuenta en Specter.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
