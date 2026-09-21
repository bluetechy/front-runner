import { GraphQLError, Kind, ValidationRule } from 'graphql';
// Count expanded selections, including aliases and fragment repetitions. Cycles are
// rejected by GraphQL's standard rules; this guard also terminates safely on them.
export const queryLimits: ValidationRule = context => ({
  OperationDefinition(operation) {
    let fields = 0;
    const walk = (set: typeof operation.selectionSet, depth: number, fragments: Set<string>): boolean => {
      if (depth > 10) return false;
      for (const selection of set.selections) {
        if (selection.kind === Kind.FIELD) {
          if (++fields > 100) return false;
          if (selection.name.value.startsWith('__')) continue;
          if (selection.selectionSet && !walk(selection.selectionSet, depth + 1, fragments)) return false;
        } else if (selection.kind === Kind.INLINE_FRAGMENT) {
          if (!walk(selection.selectionSet, depth, fragments)) return false;
        } else {
          const name = selection.name.value;
          if (fragments.has(name)) return false;
          const fragment = context.getFragment(name);
          if (fragment && !walk(fragment.selectionSet, depth, new Set([...fragments, name]))) return false;
        }
      }
      return true;
    };
    if (!walk(operation.selectionSet, 1, new Set())) {
      context.reportError(new GraphQLError('Query exceeds the depth or field limit', { extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }));
    }
  },
});
