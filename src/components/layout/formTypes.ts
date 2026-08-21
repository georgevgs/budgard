// Which form dialog FormsManager should show. Lives apart from the component
// so hooks can import it without dragging a component module in (and so
// FormsManager keeps fast refresh).
export const FORM_TYPES = {
  // The keypad sheet — two taps and a number, which is what adding an expense
  // costs in the common case.
  QUICK_ADD: 'quickAdd',
  // The full form, reached from the sheet's "More details" or by editing.
  NEW_EXPENSE: 'newExpense',
  EDIT_EXPENSE: 'editExpense',
} as const;

export type FormType = (typeof FORM_TYPES)[keyof typeof FORM_TYPES] | null;
