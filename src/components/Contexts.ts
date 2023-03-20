import { createContext } from 'react'

import { ModelForMagic } from '../utils/openAI'
import { Note } from './Notebook'

export interface FlowContextType {
  metaPressed: boolean
  model: ModelForMagic
  selectedComponents: {
    nodes: string[]
    edges: string[]
  }
  doSetNodesEditing: (nodeIds: string[], editing: boolean) => void
  doSetEdgesEditing: (edgeIds: string[], editing: boolean) => void
  selectNodes: (nodeIds: string[]) => void
  setModel: (model: ModelForMagic) => void
}
export const FlowContext = createContext<FlowContextType>({} as FlowContextType)

// export interface EdgeContextType {
//   roughZoomLevel: number
// }
// export const EdgeContext = createContext<EdgeContextType>({} as EdgeContextType)

export interface NotebookContextType {
  notes: Note[]
  setNotes: (notes: Note[]) => void
  notesOpened: boolean
  setNotesOpened: (notesOpened: boolean) => void
  addNote: (note: Note) => void
  deleteNote: (noteId: string) => void
}

export const NotebookContext = createContext<NotebookContextType>(
  {} as NotebookContextType
)
