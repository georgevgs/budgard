// Which form dialog FormsManager should show. Lives apart from the component
// so hooks can import it without dragging a component module in (and so
// FormsManager keeps fast refresh).
export const FORM_TYPES = {
  NEW_EXPENSE: 'newExpense',
  EDIT_EXPENSE: 'editExpense',
} as const;

export type FormType = (typeof FORM_TYPES)[keyof typeof FORM_TYPES] | null;
