"use client"

import { useEffect, useRef, useCallback } from "react"
import { useDebounce } from "use-debounce"
import type { UseFormWatch } from "react-hook-form"

export function useMbtiAutosave(
  studentId: string,
  onSave: (responses: Record<string, number>) => Promise<void>,
  watch: UseFormWatch<{ responses: Record<string, number> }>,
  debounceMs = 2000
) {
  const responses = watch("responses")
  const [debouncedResponses] = useDebounce(responses, debounceMs)
  const isSaving = useRef(false)
  const lastSaved = useRef<string | null>(null)

  const save = useCallback(async (data: Record<string, number>) => {
    const dataString = JSON.stringify(data)
    if (isSaving.current || dataString === lastSaved.current) return
    if (Object.keys(data || {}).length === 0) return

    isSaving.current = true
    try {
      await onSave(data)
      lastSaved.current = dataString
    } catch (error) {
      console.error("Autosave failed:", error)
    } finally {
      isSaving.current = false
    }
  }, [onSave])

  useEffect(() => {
    if (debouncedResponses && Object.keys(debouncedResponses).length > 0) {
      save(debouncedResponses)
    }
  }, [debouncedResponses, save])

  const cancelAutosave = useCallback(() => {
    lastSaved.current = JSON.stringify(responses)
  }, [responses])

  return { cancelAutosave, isSaving: isSaving.current }
}
