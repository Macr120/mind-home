import { useState } from 'react'
import type { Hobby } from '../../core/data/db'
import { hobbiesRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { COLORES_HOBBY, EMOJIS_HOBBY } from './stats'
import { COLOR } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'

/** Formulario de alta/edición de un hobby: nombre, emoji, color y meta semanal. */
export function FormHobby({ hobby, onCerrar }: { hobby?: Hobby; onCerrar: () => void }) {
  const t = useT()
  const [nombre, setNombre] = useState(hobby?.nombre ?? '')
  const [emoji, setEmoji] = useState(hobby?.emoji ?? EMOJIS_HOBBY[0])
  const [color, setColor] = useState(hobby?.color ?? COLORES_HOBBY[0])
  const [meta, setMeta] = useState(hobby?.metaDiasSemana ?? 0)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    const datos = { nombre: n, emoji, color, metaDiasSemana: meta || undefined }
    if (hobby?.id != null) await hobbiesRepo.update(hobby.id, datos)
    else await hobbiesRepo.add({ ...datos, creadoEn: new Date().toISOString() })
    onCerrar()
  }

  return (
    <form onSubmit={guardar} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
      <p className="text-sm font-semibold">
        {hobby ? t('hobbies.form.editar', 'Editar hobby') : t('hobbies.form.nuevo', 'Nuevo hobby')}
      </p>

      <input
        value={nombre}
        onChange={(ev) => setNombre(ev.target.value)}
        placeholder={t('hobbies.ph.nombre', 'Ej. Pintura, ajedrez, fotografía...')}
        maxLength={40}
        className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
      />

      <div className="flex flex-wrap gap-1.5">
        {EMOJIS_HOBBY.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`h-9 w-9 rounded-lg text-xl transition ${
              emoji === e ? 'bg-violet-400/30 ring-2 ring-violet-400' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-xs text-white/50">{t('hobbies.form.color', 'Color')}</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORES_HOBBY.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full transition ${
                color === c ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#0f1115]' : 'hover:scale-110'
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-white/50">
          {t('hobbies.form.meta', 'Meta semanal (días de práctica)')}
        </p>
        <PestanasCarpeta
          items={[0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({
            id: String(n),
            labelEs: n === 0 ? 'Sin meta' : String(n),
            clave: n === 0 ? 'hobbies.form.sinMeta' : undefined,
            label: n === 0 ? undefined : String(n),
          }))}
          activo={String(meta)}
          onCambio={(id) => setMeta(Number(id))}
          color={COLOR}
          variante="sub"
          nivel={3}
          flecha={false}
          desplazable
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="ui-accent-bg flex-1 rounded-lg py-2 font-bold hover:brightness-110 transition"
        >
          {t('hobbies.form.guardar', 'Guardar')}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg bg-white/5 px-4 py-2 font-semibold hover:bg-white/10 transition"
        >
          {t('hobbies.form.cancelar', 'Cancelar')}
        </button>
      </div>
    </form>
  )
}
