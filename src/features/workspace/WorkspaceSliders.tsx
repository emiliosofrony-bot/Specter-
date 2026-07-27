import { useEffect, useState } from 'react'
import { useProfile, useUpdateWorkspaceConfig } from '@/hooks/useProfile'
import { parseWorkspaceConfig } from '@/api/profiles'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

export function WorkspaceSliders() {
  const { data: profile } = useProfile()
  const updateConfig = useUpdateWorkspaceConfig()

  const config = profile ? parseWorkspaceConfig(profile.workspace_config) : null
  const [nivelInvestigacion, setNivelInvestigacion] = useState(50)

  useEffect(() => {
    if (config) setNivelInvestigacion(config.nivel_investigacion)
  }, [config?.nivel_investigacion])

  if (!config) return null

  return (
    <div className="flex w-72 shrink-0 flex-col gap-6 border-r border-border bg-panel p-margin-mobile">
      <h2 className="text-label-md uppercase tracking-wide text-surface-variant">Workspace</h2>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Nivel de investigación</Label>
          <span className="text-label-sm text-surface-variant">{nivelInvestigacion}</span>
        </div>
        <Slider
          value={[nivelInvestigacion]}
          min={0}
          max={100}
          step={5}
          onValueChange={([value]) => setNivelInvestigacion(value ?? 0)}
          onValueCommit={([value]) => updateConfig.mutate({ nivel_investigacion: value ?? 0 })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Enfoque B2B</Label>
        <Switch
          checked={config.enfoque === 'B2B'}
          onCheckedChange={(checked) => updateConfig.mutate({ enfoque: checked ? 'B2B' : 'B2C' })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Modo oscuro</Label>
        <Switch
          checked={config.is_dark_mode}
          onCheckedChange={(checked) => updateConfig.mutate({ is_dark_mode: checked })}
        />
      </div>
    </div>
  )
}
