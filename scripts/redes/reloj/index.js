// Dispara `.github/workflows/publicar-guias.yml` como corrida de reloj: el workflow
// solo publica si en R2 está el aviso `nube-activa`, igual que con su propio horario.
export default {
  async scheduled(_evento, env) {
    const resp = await fetch(
      'https://api.github.com/repos/Macr120/mind-home/actions/workflows/publicar-guias.yml/dispatches',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'mindhaos-reloj-guias',
        },
        body: JSON.stringify({ ref: 'main', inputs: { reloj: true } }),
      },
    )
    if (!resp.ok) throw new Error(`GitHub respondió ${resp.status}: ${await resp.text()}`)
  },
}
