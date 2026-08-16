import { useEffect, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

/**
 * Crea el FaceLandmarker de MediaPipe con los assets servidos en local
 * (`public/mediapipe/`: wasm + face_landmarker.task), en modo VIDEO con la
 * matriz de transformación facial activada (es la que posa la cabeza 3D).
 */
export function useFaceLandmarker(): { landmarker: FaceLandmarker | null; error: string | null } {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    let lm: FaceLandmarker | null = null
    ;(async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks('/mediapipe')
        lm = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
          outputFaceBlendshapes: true,
        })
        if (vivo) setLandmarker(lm)
        else lm.close()
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      vivo = false
      lm?.close()
      setLandmarker(null)
    }
  }, [])

  return { landmarker, error }
}
