import {
  BaseSyntheticEvent,
  memo,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Edge, Node, useReactFlow } from 'reactflow'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'

import { contentEditingTimeout, terms } from '../constants'
import { magicExplain, PromptSourceComponentsType } from '../utils/magicExplain'
import { getOpenAICompletion } from '../utils/openAI'
import {
  NodeLabelAndTags,
  predefinedPrompts,
  predefinedResponses,
} from '../utils/promptsAndResponses'
import { getWikiData } from './wikiBase'

interface MagicToolboxProps {
  className?: string
  children: ReactElement | ReactElement[]
  zoom: number
}
export const MagicToolbox = ({
  className,
  children,
  zoom,
}: MagicToolboxProps) => {
  return (
    <div
      className={`magic-toolbox${className ? ` ${className}` : ''}`}
      style={{
        transform: `scale(${1 / zoom})`,
      }}
      onClick={e => {
        e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}

interface MagicToolboxItemProps {
  title?: string
  children: ReactElement
  className?: string
}
export const MagicToolboxItem = ({
  title,
  children,
  className,
}: MagicToolboxItemProps) => {
  return (
    <div className={`magic-toolbox-item${className ? ' ' + className : ''}`}>
      {title && <span className="magic-toolbox-item-title">{title}</span>}
      {/* <div className="magic-toolbox-item-content">{children}</div> */}
      {children}
    </div>
  )
}

interface MagicToolboxButtonProps {
  content: ReactElement | string
  onClick?: () => void
  preventDefault?: boolean
  className?: string
  disabled?: boolean
}
export const MagicToolboxButton = memo(
  ({
    content,
    onClick,
    preventDefault = true,
    className = '',
    disabled = false,
  }: MagicToolboxButtonProps) => {
    // handle click
    const handleOnClick = useCallback(
      (e: BaseSyntheticEvent) => {
        if (preventDefault) {
          e.preventDefault()
          e.stopPropagation()
        }
        onClick && onClick()
      },
      [onClick, preventDefault]
    )

    return (
      <button
        className={
          'magic-toolbox-button' +
          (content === predefinedResponses.noValidResponse()
            ? ' disabled'
            : '') +
          (className ? ` ${className}` : '')
        }
        onClick={handleOnClick}
        disabled={disabled}
      >
        {content}
      </button>
    )
  }
)

interface MagicTagProps {
  tag: string
  onClick?: (tag: string) => void
  disabled?: boolean
}
export const MagicTag = memo(
  ({ tag, onClick, disabled = false }: MagicTagProps) => {
    const handleOnClick = useCallback(
      (e: BaseSyntheticEvent) => {
        e.preventDefault()
        e.stopPropagation()

        onClick && onClick(tag)
      },
      [onClick, tag]
    )

    return (
      <button
        className={'magic-toolbox-tag'}
        onClick={handleOnClick}
        disabled={disabled}
      >
        {tag}
      </button>
    )
  }
)

interface MagicNodeTaggingItemProps {
  targetId: string
  label: string
}
export const MagicNodeTaggingItem = memo(
  ({ targetId, label }: MagicNodeTaggingItemProps) => {
    const { setNodes } = useReactFlow()

    const [availableTags, setAvailableTags] = useState<string[]>([])
    const [noAvailable, setNoAvailable] = useState<boolean>(false)
    // const prevLabel = usePrevious(label)

    const handleOnClick = useCallback(
      (tag: string) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === targetId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  tags: [...node.data.tags, tag],
                },
              }
            }
            return node
          })
        })
      },
      [setNodes, targetId]
    )

    useEffect(() => {
      setNoAvailable(false)
      setAvailableTags([])

      const _timeout = setTimeout(() => {
        if (label) {
          getWikiData(label).then(res => {
            setAvailableTags(res)
            if (res.length === 0) setNoAvailable(true)
          })
        }
      }, contentEditingTimeout)

      return () => _timeout && clearTimeout(_timeout)
    }, [label])

    return (
      <MagicToolboxItem
        className="magic-tagging-item"
        title={`${terms.wiki} tags`}
      >
        <div className="magic-tagging-options">
          {availableTags.length === 0 ? (
            !noAvailable ? (
              <div className="waiting-for-model-placeholder">
                <PuffLoader size={32} color="#13a600" />
              </div>
            ) : (
              <MagicTag
                key={predefinedResponses.noValidTags()}
                tag={predefinedResponses.noValidTags()}
                disabled={true}
              />
            )
          ) : (
            availableTags.map(tag => (
              <MagicTag
                key={`${targetId}-${tag}`}
                tag={tag}
                onClick={handleOnClick}
              />
            ))
          )}
        </div>
      </MagicToolboxItem>
    )
  }
)

interface MagicSuggestItemProps {
  target: 'node' | 'edge'
  targetId: string
  nodeLabelAndTags: NodeLabelAndTags[]
  edgeLabels: string[]
  disabled?: boolean
}
export const MagicSuggestItem = memo(
  ({
    target,
    targetId,
    nodeLabelAndTags,
    edgeLabels,
    disabled = false,
  }: MagicSuggestItemProps) => {
    const { setNodes, setEdges } = useReactFlow()

    const [modelResponse, setModelResponse] = useState<string>('')

    const handleSetSuggestion = useCallback(
      (suggestion: string) => {
        if (target === 'node') {
          setNodes((nodes: Node[]) => {
            return nodes.map(node => {
              if (node.id === targetId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: suggestion,
                  },
                }
              }
              return node
            })
          })
        } else if (target === 'edge') {
          setEdges((edges: Edge[]) => {
            return edges.map(edge => {
              if (edge.id === targetId) {
                return {
                  ...edge,
                  data: {
                    ...edge.data,
                    label: suggestion,
                  },
                }
              }
              return edge
            })
          })
        }
      },
      [setEdges, setNodes, target, targetId]
    )

    const handleSuggest = useCallback(async () => {
      const prompt = predefinedPrompts.giveNodeLabelSuggestionsFromNodes(
        target,
        nodeLabelAndTags
      )

      // !
      if (!disabled) {
        const response = await getOpenAICompletion(prompt)

        if (response.error) {
          // TODO like try again?
          setModelResponse(predefinedResponses.noValidResponse)
        }

        if (response && response.choices && response.choices.length > 0)
          setModelResponse(response.choices[0]?.text)
        else setModelResponse(predefinedResponses.noValidResponse)
      } else setModelResponse(predefinedResponses.noValidResponse)
    }, [disabled, nodeLabelAndTags, target])

    const autoSuggest = useRef(true)
    useEffect(() => {
      if (disabled) return
      if (autoSuggest.current) {
        autoSuggest.current = false
        handleSuggest()
      }
    }, [disabled, handleSuggest])

    const responseButtons: ReactElement[] = modelResponse
      .split(', ')
      .slice(0, 5)
      .map((label, i) => {
        // remove extra spaces and line breaks around the label string
        // and remove the last character if it's a period
        label = label.trim()
        // remove 1. 2. 3. etc. from the beginning of the label
        label = label.replace(/^\d+\./, '')
        // remove quotation marks
        label = label.replace(/['"]+/g, '')
        ////
        label = label.trim()
        // to lower case for edge labels
        if (target === 'edge') label = label.toLowerCase()

        if (label[label.length - 1] === '.') {
          label = label.slice(0, -1)
        }

        return (
          <MagicToolboxButton
            key={i}
            content={label}
            onClick={() => {
              handleSetSuggestion(label)
            }}
          />
        )
      })

    return (
      <MagicToolboxItem
        className="magic-suggest-item"
        title={`${terms.gpt} suggestions`}
      >
        <div className="magic-suggest-options">
          {modelResponse.length > 0 ? (
            <>{responseButtons}</>
          ) : (
            <div className="waiting-for-model-placeholder">
              <PuffLoader size={32} color="#57068c" />
            </div>
          )}
        </div>
      </MagicToolboxItem>
    )
  },
  isEqual
)

interface MagicAskItemProps {
  sourceComponents: PromptSourceComponentsType
}
export const MagicAskItem = ({ sourceComponents }: MagicAskItemProps) => {
  const { getNodes, addNodes, fitView } = useReactFlow()

  return (
    <MagicToolboxItem title={`ask ${terms.gpt}`}>
      <MagicToolboxButton
        content={
          <>
            <AutoFixHighRoundedIcon />
            <span>explain</span>
          </>
        }
        onClick={() => {
          magicExplain(getNodes(), sourceComponents, addNodes, fitView)
        }}
      />
    </MagicToolboxItem>
  )
}
