// The RK4 geodesic Web Worker (brief §3) — a browser worker thread, not a
// Cloudflare Worker; integration never blocks the render loop. Thin shell:
// batch of initial conditions in (transferred), sample buffers out
// (transferred). All math lives in the pure, node-tested core.
import { integrateGeodesic } from './core'
import type { GeodesicRequest, GeodesicResponse } from './core'

// Structural typing instead of lib="webworker" to avoid DOM/WebWorker lib
// conflicts under the app tsconfig.
interface WorkerScope {
  onmessage: ((e: MessageEvent<GeodesicRequest>) => void) | null
  postMessage(msg: GeodesicResponse, transfer: Transferable[]): void
}
const scope = self as unknown as WorkerScope

scope.onmessage = (e: MessageEvent<GeodesicRequest>) => {
  const { id, n, steps, dLambda, x0s, u0s } = e.data
  const samples = new Float64Array(n * (steps + 1) * 4)
  const counts = new Int32Array(n)
  for (let r = 0; r < n; r++) {
    counts[r] = integrateGeodesic(
      x0s.subarray(r * 4, r * 4 + 4),
      u0s.subarray(r * 4, r * 4 + 4),
      dLambda,
      steps,
      samples,
      r * (steps + 1) * 4,
    )
  }
  scope.postMessage({ id, n, steps, samples, counts }, [samples.buffer, counts.buffer])
}
