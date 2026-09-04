type CursorColumn = {
  name: string;
  value: string;
};

type CursorDirection = 'ascending' | 'descending';

// Produces the PostgREST form of a row-value cursor. Values come only from the
// last database row in the previous page; callers own the fixed column names.
export const buildKeysetFilter = (
  columns: CursorColumn[],
  direction: CursorDirection,
): string => {
  let operator = 'lt';
  if (direction === 'ascending') {
    operator = 'gt';
  }

  const clauses: string[] = [];
  for (let index = 0; index < columns.length; index += 1) {
    const comparisons: string[] = [];
    for (let prefix = 0; prefix < index; prefix += 1) {
      const column = columns[prefix];
      comparisons.push(`${column.name}.eq.${column.value}`);
    }

    const column = columns[index];
    comparisons.push(`${column.name}.${operator}.${column.value}`);
    if (comparisons.length === 1) {
      clauses.push(comparisons[0]);
    } else {
      clauses.push(`and(${comparisons.join(',')})`);
    }
  }

  return clauses.join(',');
};
