import { useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCaso } from '@/hooks/useCasos'
import type { Tables } from '@/types/database.types'

type TipoDocumento = Tables<'casos'>['tipo_documento']

const TIPOS: { value: NonNullable<TipoDocumento>; label: string }[] = [
  { value: 'tutela', label: 'Tutela' },
  { value: 'peticion', label: 'Derecho de petición' },
  { value: 'demanda', label: 'Demanda' },
]

export function CreateCasoDialog() {
  const [open, setOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<NonNullable<TipoDocumento>>('tutela')
  const createCaso = useCreateCaso()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await createCaso.mutateAsync({ titulo, tipo_documento: tipoDocumento })
    setTitulo('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuevo caso</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo caso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo_documento">Tipo de documento</Label>
            <select
              id="tipo_documento"
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as NonNullable<TipoDocumento>)}
              className="h-10 rounded-lg border border-border bg-transparent px-3 text-body-md text-surface"
            >
              {TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value} className="bg-panel">
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={createCaso.isPending}>
            {createCaso.isPending ? 'Creando…' : 'Crear caso'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
