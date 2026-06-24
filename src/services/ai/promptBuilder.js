export function PromptBuilder({ context, personality, toolResults = [] } = {}) {
  return {
    context,
    personality,
    toolResults,
    instructions: {
      provider: null,
      format: 'structured-object',
      shouldAnswerOnlyFromKnownContext: Boolean(personality?.neverGuess),
      shouldAskIfUnsure: Boolean(personality?.askIfUnsure),
    },
  }
}

