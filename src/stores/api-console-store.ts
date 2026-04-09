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

export type Workspace = {
  id: string
  name: string
  url: string
  createdAt: string
  lastOpenedAt: string
}

type ApiConsoleState = {
  authToken: string
  currentWorkspaceId: string
  drafts: Record<string, RequestDraft>
  recentSpecs: RecentSpec[]
  responseViewMode: 'auto' | 'json' | 'text'
  selectedOperationKey: string
  specUrl: string
  workspaces: Workspace[]
  ensureDraft: (draftKey: string, seed: RequestDraft) => void
  saveWorkspace: (workspace: { id?: string; name: string; url: string }) => string
  setAuthToken: (token: string) => void
  setCurrentWorkspaceId: (workspaceId: string) => void
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
  touchWorkspace: (workspaceId: string) => void
  rememberSpec: (spec: { title: string; url: string }) => void
}

type PersistedApiConsoleState = {
  authToken?: string
  currentWorkspaceId?: string
  drafts?: Record<string, RequestDraft>
  recentSpecs?: RecentSpec[]
  responseViewMode?: 'auto' | 'json' | 'text'
  selectedOperationKey?: string
  specUrl?: string
  workspaces?: Workspace[]
}

const STORAGE_KEY = 'bdoc-console'

function createWorkspaceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `workspace-${Math.random().toString(36).slice(2, 10)}`
}

function deriveWorkspaceName(url: string) {
  try {
    const parsedUrl = new URL(url)
    const segments = parsedUrl.pathname.split('/').filter(Boolean)
    const lastSegment = segments.at(-1)

    if (lastSegment) {
      return decodeURIComponent(lastSegment)
    }

    return parsedUrl.hostname
  } catch {
    return url
  }
}

function normalizeWorkspace(
  workspace: Partial<Workspace> & Pick<Workspace, 'url'>,
  fallbackName?: string,
): Workspace {
  const now = new Date().toISOString()
  const normalizedUrl = workspace.url.trim()

  return {
    id: workspace.id?.trim() || createWorkspaceId(),
    name: workspace.name?.trim() || fallbackName?.trim() || deriveWorkspaceName(normalizedUrl),
    url: normalizedUrl,
    createdAt: workspace.createdAt || now,
    lastOpenedAt: workspace.lastOpenedAt || workspace.createdAt || now,
  }
}

function migrateWorkspaces(
  workspaces: Workspace[] | undefined,
  recentSpecs: RecentSpec[] | undefined,
  specUrl: string | undefined,
) {
  const fromExisting =
    workspaces?.map((workspace) => normalizeWorkspace(workspace)).filter((workspace) => workspace.url.length > 0) ??
    []
  const recentWorkspaceSources =
    recentSpecs?.map((spec) =>
      normalizeWorkspace({
        name: spec.title,
        url: spec.url,
        lastOpenedAt: spec.lastOpenedAt,
      }),
    ) ?? []
  const currentWorkspaceSource =
    specUrl && specUrl.trim()
      ? [
          normalizeWorkspace({
            name: deriveWorkspaceName(specUrl),
            url: specUrl,
          })
        ]
      : []

  const deduped = [...fromExisting, ...recentWorkspaceSources, ...currentWorkspaceSource].reduce<Workspace[]>(
    (result, workspace) => {
      if (result.some((entry) => entry.url === workspace.url)) {
        return result
      }

      result.push(workspace)
      return result
    },
    [],
  )

  return deduped.sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
}

function clearLegacyStringParams(values: Record<string, string> | undefined): Record<string, string> {
  if (!values) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === 'string' ? '' : value]),
  )
}

function mergeRecord(
  current: Record<string, string>,
  seed: Record<string, string>,
): Record<string, string> {
  return {
    ...seed,
    ...current,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function mergeJsonValue(seed: unknown, current: unknown): unknown {
  if (Array.isArray(seed) && Array.isArray(current)) {
    if (current.length === 0) {
      return current
    }

    const nextLength = Math.max(seed.length, current.length)
    return Array.from({ length: nextLength }, (_, index) => {
      if (index >= current.length) {
        return seed[index]
      }

      const seedItem = index < seed.length ? seed[index] : seed.at(-1)
      return seedItem === undefined ? current[index] : mergeJsonValue(seedItem, current[index])
    })
  }

  if (isPlainObject(seed) && isPlainObject(current)) {
    const merged: Record<string, unknown> = { ...seed }

    for (const [key, value] of Object.entries(current)) {
      merged[key] = key in seed ? mergeJsonValue(seed[key], value) : value
    }

    return merged
  }

  return current
}

function mergeBodyValue(current: string, seed: string): string {
  if (!current) {
    return current
  }

  if (!seed) {
    return current
  }

  const parsedSeed = tryParseJson(seed)
  const parsedCurrent = tryParseJson(current)

  if (parsedSeed === undefined || parsedCurrent === undefined) {
    return current
  }

  try {
    return JSON.stringify(mergeJsonValue(parsedSeed, parsedCurrent), null, 2)
  } catch {
    return current
  }
}

function mergeBodyRecord(
  current: Record<string, string>,
  seed: Record<string, string>,
): Record<string, string> {
  const merged = { ...seed }

  for (const [contentType, value] of Object.entries(current)) {
    merged[contentType] =
      contentType in seed ? mergeBodyValue(value, seed[contentType] ?? '') : value
  }

  return merged
}

export function getDraftKey(specUrl: string, operationKey: string): string {
  return `${specUrl}::${operationKey}`
}

export const useApiConsoleStore = create<ApiConsoleState>()(
  persist(
    (set) => ({
      authToken: '',
      currentWorkspaceId: '',
      drafts: {},
      recentSpecs: [],
      responseViewMode: 'auto',
      selectedOperationKey: '',
      specUrl: '',
      workspaces: [],
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
                bodyByContentType: mergeBodyRecord(current.bodyByContentType, seed.bodyByContentType),
                selectedContentType: current.selectedContentType || seed.selectedContentType,
                selectedServerUrl: current.selectedServerUrl || seed.selectedServerUrl,
              },
            },
          }
        }),
      saveWorkspace: (workspace) => {
        const normalizedUrl = workspace.url.trim()
        const normalizedName = workspace.name.trim()

        if (!normalizedUrl) {
          return ''
        }

        let savedWorkspaceId = ''
        set((state) => {
          const now = new Date().toISOString()
          const existingWorkspace = state.workspaces.find(
            (entry) => entry.id === workspace.id || entry.url === normalizedUrl,
          )
          const nextWorkspace = normalizeWorkspace(
            {
              ...existingWorkspace,
              id: existingWorkspace?.id || workspace.id,
              name: normalizedName || existingWorkspace?.name || deriveWorkspaceName(normalizedUrl),
              url: normalizedUrl,
              createdAt: existingWorkspace?.createdAt || now,
              lastOpenedAt: now,
            },
            deriveWorkspaceName(normalizedUrl),
          )

          savedWorkspaceId = nextWorkspace.id

          return {
            currentWorkspaceId: nextWorkspace.id,
            workspaces: [
              nextWorkspace,
              ...state.workspaces.filter(
                (entry) => entry.id !== nextWorkspace.id && entry.url !== nextWorkspace.url,
              ),
            ],
          }
        })

        return savedWorkspaceId
      },
      setAuthToken: (token) => set({ authToken: token }),
      setCurrentWorkspaceId: (workspaceId) => set({ currentWorkspaceId: workspaceId }),
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
      touchWorkspace: (workspaceId) =>
        set((state) => {
          const workspace = state.workspaces.find((entry) => entry.id === workspaceId)

          if (!workspace) {
            return {}
          }

          const updatedWorkspace = {
            ...workspace,
            lastOpenedAt: new Date().toISOString(),
          }

          return {
            workspaces: [
              updatedWorkspace,
              ...state.workspaces.filter((entry) => entry.id !== workspaceId),
            ],
          }
        }),
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
      version: 3,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as PersistedApiConsoleState
        const migratedWorkspaces = migrateWorkspaces(state.workspaces, state.recentSpecs, state.specUrl)
        const currentWorkspaceId =
          state.currentWorkspaceId && migratedWorkspaces.some((workspace) => workspace.id === state.currentWorkspaceId)
            ? state.currentWorkspaceId
            : migratedWorkspaces.find((workspace) => workspace.url === state.specUrl)?.id || ''

        return {
          ...state,
          currentWorkspaceId,
          drafts: Object.fromEntries(
            Object.entries(state.drafts ?? {}).map(([draftKey, draft]) => [
              draftKey,
              {
                ...draft,
                pathParams: clearLegacyStringParams(draft.pathParams),
                queryParams: clearLegacyStringParams(draft.queryParams),
                headerParams: clearLegacyStringParams(draft.headerParams),
              },
            ]),
          ),
          workspaces: migratedWorkspaces,
        }
      },
    },
  ),
)
