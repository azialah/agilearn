import { describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc },
}))

import { reconcileNotificationIncident } from './notifications'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('reconcileNotificationIncident', () => {
  it('sends the newest queued state after an older request fails', async () => {
    const firstRequest = deferred<{ error: null }>()
    rpc.mockReset()
    rpc
      .mockImplementationOnce(() => firstRequest.promise)
      .mockResolvedValueOnce({ error: null })

    const initial = reconcileNotificationIncident({
      type: 'low_average',
      classroomId: 'classroom-1',
      studentId: 'student-1',
      courseSubjectId: 'subject-1',
      active: true,
      payload: { studentName: 'Ari Reyes', value: 68 },
    })
    const newest = reconcileNotificationIncident({
      type: 'low_average',
      classroomId: 'classroom-1',
      studentId: 'student-1',
      courseSubjectId: 'subject-1',
      active: false,
      payload: { studentName: 'Ari Reyes', value: 72 },
    })

    firstRequest.reject(new Error('temporary RPC failure'))

    await expect(initial).resolves.toBeUndefined()
    await expect(newest).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({
      p_active: false,
      p_payload: { studentName: 'Ari Reyes', value: 72 },
    })
  })
})
