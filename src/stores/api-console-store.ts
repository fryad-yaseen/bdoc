import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { RequestDraftSeed } from '@/lib/openapi'

type RequestDraft = RequestDraftSeed & {
  selectedServerUrl: string
}

type RecentSpec = {
  url: string
  title: string
  lastOpenedAt: string
}

type ApiConsoleState = {
  authToken: string
  drafts: Record<string, RequestDraft>
  recentSpecs: RecentSpec[]
  responseViewMode: 'auto' | 'json' | 'text'
  selectedOperationKey: string
  specUrl: string
  ensureDraft: (draftKey: string, seed: RequestDraft) => void
  setAuthToken: (token: string) => void
  setBodyValue: (draftKey: string, contentType: string, value: string) => void
  setDraftField: (
    draftKey: string,
    section: 'pathParams' | 'queryParams' | 'headerParams',
    name: string,
    value: string,
  ) => void
  setResponseViewMode: (mode: 'auto' | 'json' | 'text') => void
  setSelectedContentType: (draftKey: string, contentType: string) => void
  setSelectedOperationKey: (operationKey: string) => void
  setSelectedServerUrl: (draftKey: string, serverUrl: string) => void
  setSpecUrl: (url: string) => void
  rememberSpec: (spec: { title: string; url: string }) => void
}

const STORAGE_KEY = 'bdoc-console'

function mergeRecord(
  current: Record<string, string>,
  seed: Record<string, string>,
): Record<string, string> {
  return {
    ...seed,
    ...current,
  }
}

export function getDraftKey(specUrl: string, operationKey: string): string {
  return `${specUrl}::${operationKey}`
}

export const useApiConsoleStore = create<ApiConsoleState>()(
  persist(
    (set) => ({
      authToken: '',
      drafts: {},
      recentSpecs: [],
      responseViewMode: 'auto',
      selectedOperationKey: '',
      specUrl: '',
      ensureDraft: (draftKey, seed) =>
        set((state) => {
          const current = state.drafts[draftKey]
          if (!current) {
            return {
              drafts: {
                ...state.drafts,
                [draftKey]: seed,
              },
            }
          }

          return {
            drafts: {
              ...state.drafts,
              [draftKey]: {
                ...seed,
                ...current,
                pathParams: mergeRecord(current.pathParams, seed.pathParams),
                queryParams: mergeRecord(current.queryParams, seed.queryParams),
                headerParams: mergeRecord(current.headerParams, seed.headerParams),
                bodyByContentType: mergeRecord(current.bodyByContentType, seed.bodyByContentType),
                selectedContentType: current.selectedContentType || seed.selectedContentType,
                selectedServerUrl: current.selectedServerUrl || seed.selectedServerUrl,
              },
            },
          }
        }),
      setAuthToken: (token) => set({ authToken: token }),
      setBodyValue: (draftKey, contentType, value) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftKey]: {
              ...state.drafts[draftKey],
              bodyByContentType: {
                ...state.drafts[draftKey]?.bodyByContentType,
                [contentType]: value,
              },
            },
          },
        })),
      setDraftField: (draftKey, section, name, value) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftKey]: {
              ...state.drafts[draftKey],
              [section]: {
                ...state.drafts[draftKey]?.[section],
                [name]: value,
              },
            },
          },
        })),
      setResponseViewMode: (mode) => set({ responseViewMode: mode }),
      setSelectedContentType: (draftKey, contentType) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftKey]: {
              ...state.drafts[draftKey],
              selectedContentType: contentType,
            },
          },
        })),
      setSelectedOperationKey: (operationKey) => set({ selectedOperationKey: operationKey }),
      setSelectedServerUrl: (draftKey, serverUrl) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftKey]: {
              ...state.drafts[draftKey],
              selectedServerUrl: serverUrl,
            },
          },
        })),
      setSpecUrl: (url) => set({ specUrl: url }),
      rememberSpec: (spec) =>
        set((state) => ({
          recentSpecs: [
            {
              url: spec.url,
              title: spec.title,
              lastOpenedAt: new Date().toISOString(),
            },
            ...state.recentSpecs.filter((entry) => entry.url !== spec.url),
          ].slice(0, 6),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
