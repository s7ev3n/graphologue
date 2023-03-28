import { v4 as uuidv4 } from 'uuid'

import {
  AnswerObject,
  PartialQuestionAndAnswer,
  QuestionAndAnswer,
  RawAnswerRange,
} from '../App'

export const getAnswerObjectId = () => {
  return `answer-object-${uuidv4()}`
}

export const rangeToId = (range: RawAnswerRange): string => {
  return `range-${range.start}-${range.end}`
}

export const originTextToRange = (
  response: string,
  origin: string
): RawAnswerRange => {
  const start = response.indexOf(origin)
  return {
    start,
    end: start + origin.length,
  }
}

export const rangesToOriginText = (response: string, range: RawAnswerRange) => {
  return response.substring(range.start, range.end)
}

export const findHighlightedRangeByAnswerObjectId = (
  answerInformation: AnswerObject[],
  answerObjectId: string
): RawAnswerRange | undefined => {
  return answerInformation.find(
    answerObject => answerObject.id === answerObjectId
  )?.origin
}

export const addOrMergeRanges = (
  existingRanges: RawAnswerRange[],
  newRange: RawAnswerRange
) => {
  let merged = false

  const newRanges = existingRanges.map(existingRange => {
    // check if newRange and existingRange overlap
    if (
      newRange.start <= existingRange.end &&
      newRange.end >= existingRange.start
    ) {
      merged = true
      return {
        start: Math.min(existingRange.start, newRange.start),
        end: Math.max(existingRange.end, newRange.end),
      }
    }

    return existingRange
  })

  // sort new ranges
  newRanges.sort((a, b) => a.start - b.start)

  if (!merged) newRanges.push(newRange)
  else {
    // merge happened
    // go through new ranges again and see if there's any overlap and merge
    let i = 0
    while (i < newRanges.length) {
      let j = i + 1
      while (j < newRanges.length) {
        if (
          newRanges[i].start <= newRanges[j].end &&
          newRanges[i].end >= newRanges[j].start
        ) {
          newRanges[i] = {
            start: Math.min(newRanges[i].start, newRanges[j].start),
            end: Math.max(newRanges[i].end, newRanges[j].end),
          }
          newRanges.splice(j, 1)
        } else {
          j++
        }
      }
      i++
    }
  }

  return newRanges
}

/* -------------------------------------------------------------------------- */

export const newQuestionAndAnswer = (
  prefill?: PartialQuestionAndAnswer
): QuestionAndAnswer => {
  return {
    id: prefill?.id ?? `question-and-answer-${uuidv4()}`,
    question: prefill?.question ?? '',
    answer: prefill?.answer ?? '',
    answerInformation: prefill?.answerInformation ?? [],
    modelStatus: {
      modelAnswering: prefill?.modelStatus?.modelAnswering ?? false,
      modelParsing: prefill?.modelStatus?.modelParsing ?? false,
      modelAnsweringComplete:
        prefill?.modelStatus?.modelAnsweringComplete ?? false,
      modelParsingComplete: prefill?.modelStatus?.modelParsingComplete ?? false,
      modelError: prefill?.modelStatus?.modelError ?? false,
    },
    reactFlow: {
      nodes: prefill?.reactFlow?.nodes ?? [],
      edges: prefill?.reactFlow?.edges ?? [],
    },
    highlighted: prefill?.highlighted ?? {
      origins: [],
      answerObjectIds: new Set(),
    },
  }
}

export const deepCopyQuestionAndAnswer = (
  qA: QuestionAndAnswer
): QuestionAndAnswer => {
  return {
    ...qA,
    answerInformation: qA.answerInformation.map(a => {
      return {
        ...a,
        origin: { ...a.origin },
        slide: { ...a.slide },
        relationships: a.relationships.map(r => ({ ...r })),
      } as AnswerObject
    }),
    modelStatus: {
      ...qA.modelStatus,
    },
    highlighted: {
      ...qA.highlighted,
    },
  }
}

export const helpSetQuestionAndAnswer = (
  prevQsAndAs: QuestionAndAnswer[],
  id: string,
  newQAndA: PartialQuestionAndAnswer
): QuestionAndAnswer[] => {
  const templateModelStatus = newQAndA.modelStatus?.modelError
    ? {
        modelAnswering: false,
        modelParsing: false,
        modelAnsweringComplete: false,
        modelParsingComplete: false,
        modelError: true,
      }
    : {}

  return prevQsAndAs.map((prevQAndA: QuestionAndAnswer) => {
    return prevQAndA.id === id
      ? {
          ...prevQAndA,
          ...newQAndA,
          modelStatus: {
            ...prevQAndA.modelStatus,
            ...(newQAndA.modelStatus ?? {}),
            ...templateModelStatus,
          },
        }
      : prevQAndA
  })
}
