/**
 * Señalización del control remoto de la máscara por Supabase Realtime: un canal
 * broadcast PÚBLICO y efímero por código de emparejamiento
 * (`mascara-remoto:<código>`). No exige cuenta: la seguridad la da el código
 * aleatorio, como un enlace de reunión (las políticas RLS de `realtime.messages`
 * solo aplican a canales privados). Por aquí solo viajan ofertas SDP e ICE; el
 * video y las órdenes van por WebRTC de teléfono a teléfono.
 */
import type { CanalSenal, MensajeSenal } from '../../../marketing/mascara/src/remoto'
import { obtenerSupabase } from '../cuenta/supabase'

export async function crearSenalMascara(codigo: string): Promise<CanalSenal> {
  const sb = await obtenerSupabase()
  if (!sb) throw new Error('offline')
  let cb: ((msj: MensajeSenal) => void) | null = null
  const canal = sb.channel(`mascara-remoto:${codigo}`)
  canal.on('broadcast', { event: 'senal' }, ({ payload }) => cb?.(payload as MensajeSenal))
  await new Promise<void>((resolver, rechazar) => {
    canal.subscribe((estado) => {
      if (estado === 'SUBSCRIBED') resolver()
      else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') rechazar(new Error(estado))
    })
  })
  return {
    enviar: (msj) => void canal.send({ type: 'broadcast', event: 'senal', payload: msj }),
    onMensaje: (f) => {
      cb = f
    },
    cerrar: () => void canal.unsubscribe(),
  }
}
