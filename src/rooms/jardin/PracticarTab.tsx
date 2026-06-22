import { useState } from 'react'
import { sesionesMindfulnessRepo } from '../../core/data/repository'
import { PRESETS, TIPOS, getTipo } from './constantes'
import { hoyISO } from './fecha'
import { RespiracionGuiada } from './RespiracionGuiada'
import { Temporizador } from './Temporizador'
import { useT } from '../../core/i18n/useT'

export function PracticarTab() {
  const t = useT()
  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [activo, setActivo] = useState(false)
  const [nota, setNota] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]
  const lista =
    filtroTipo === 'todos'
      ? PRESETS
      : PRESETS.filter((p) => p.tipo === filtroTipo)

  const completar = async () => {
    setActivo(false)
    await sesionesMindfulnessRepo.add({
      fecha: hoyISO(),
      tipo: preset.tipo,
      titulo: preset.titulo,
      duracionMin: preset.duracionMin,
      presetId: preset.id,
      nota: nota.trim() || undefined,
    })
    setNota('')
  }

  const esRespiracion = preset.tipo === 'respiracion'

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFiltroTipo('todos')}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs ${
            filtroTipo === 'todos' ? 'bg-emerald-400 text-black' : 'bg-white/5'
          }`}
        >
          {t('jardin.prac.todos', 'Todos')}
        </button>
        {TIPOS.map((tipoItem) => (
          <button
            key={tipoItem.id}
            type="button"
            onClick={() => setFiltroTipo(tipoItem.id)}
            className={`shrink-0 rounded-lg px-2 py-1 text-xs ${
              filtroTipo === tipoItem.id ? 'bg-emerald-400 text-black' : 'bg-white/5'
            }`}
          >
            {tipoItem.icon}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
        {lista.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPresetId(p.id)
              setActivo(false)
            }}
            className={`rounded-xl p-2.5 text-left text-xs border transition ${
              presetId === p.id
                ? 'border-emerald-400 bg-emerald-500/20'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="font-semibold text-white/90">{p.titulo}</span>
            <p className="text-white/40 mt-0.5">
              {getTipo(p.tipo).icon} {p.duracionMin} min
            </p>
          </button>
        ))}
      </div>

      <p className="text-xs text-white/50">{preset.descripcion}</p>

      {!activo ? (
        <button
          type="button"
          onClick={() => setActivo(true)}
          className="w-full rounded-xl py-3 font-bold bg-emerald-400 text-black text-lg"
        >
          {t('jardin.prac.comenzar', `Comenzar · ${preset.duracionMin} min`, { n: String(preset.duracionMin) })}
        </button>
      ) : (
        <>
          {esRespiracion ? (
            <RespiracionGuiada
              modo={preset.id === '478_5' ? '478' : 'caja'}
              activo={activo}
            />
          ) : (
            <Temporizador
              duracionMin={preset.duracionMin}
              activo={activo}
              titulo={preset.titulo}
              onCompletar={completar}
            />
          )}
          <button
            type="button"
            onClick={() => setActivo(false)}
            className="w-full rounded-lg py-2 text-sm bg-white/10"
          >
            {t('jardin.prac.pausar', 'Pausar')}
          </button>
          {esRespiracion && (
            <button
              type="button"
              onClick={completar}
              className="w-full rounded-lg py-2 text-sm font-bold bg-emerald-400 text-black"
            >
              {t('jardin.prac.terminar', 'Terminar y guardar')}
            </button>
          )}
        </>
      )}

      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder={t('jardin.prac.ph.nota', 'Nota después de la sesión (opcional)')}
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
      />
    </div>
  )
}
