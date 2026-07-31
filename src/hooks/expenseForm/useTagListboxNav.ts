import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TagPickerApi } from '@/hooks/expenseForm/useTagPicker';

// Keyboard navigation and ARIA wiring for the tag combobox: tracks the
// active option for aria-activedescendant and handles ArrowUp/ArrowDown/Enter
// on the search input. Mouse and filter behavior stay in useTagPicker.
export const useTagListboxNav = (tagPicker: TagPickerApi) => {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [prevInputs, setPrevInputs] = useState({
    tagSearch: tagPicker.tagSearch,
    tagPopoverOpen: tagPicker.tagPopoverOpen,
  });

  // A changed filter or a reopened popover invalidates the highlighted option
  const inputsChanged =
    prevInputs.tagSearch !== tagPicker.tagSearch ||
    prevInputs.tagPopoverOpen !== tagPicker.tagPopoverOpen;
  if (inputsChanged) {
    setPrevInputs({
      tagSearch: tagPicker.tagSearch,
      tagPopoverOpen: tagPicker.tagPopoverOpen,
    });
    setActiveIndex(-1);
  }

  const getOptionId = (index: number): string => {
    return `${listboxId}-option-${index}`;
  };

  const moveActiveOption = (delta: number) => {
    const count = tagPicker.filteredTags.length;
    if (count === 0) {
      return;
    }

    const next = getNextActiveIndex(activeIndex, delta, count);
    setActiveIndex(next);
    document
      .getElementById(getOptionId(next))
      ?.scrollIntoView({ block: 'nearest' });
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveOption(1);

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(-1);

      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    const activeTag = tagPicker.filteredTags[activeIndex];
    if (activeTag) {
      tagPicker.handleTagSelect(activeTag.id);

      return;
    }

    if (tagPicker.filteredTags.length === 1 && !tagPicker.showCreateOption) {
      tagPicker.handleTagSelect(tagPicker.filteredTags[0].id);

      return;
    }

    if (tagPicker.showCreateOption) {
      tagPicker.handleTagCreateInline();
    }
  };

  const getActiveDescendant = (): string | undefined => {
    if (activeIndex === -1) {
      return undefined;
    }

    return getOptionId(activeIndex);
  };

  return {
    listboxId,
    activeIndex,
    getOptionId,
    getActiveDescendant,
    handleSearchKeyDown,
  };
};

export type TagListboxNavApi = ReturnType<typeof useTagListboxNav>;

// --- Helpers ---

const getNextActiveIndex = (
  current: number,
  delta: number,
  count: number,
): number => {
  if (current === -1) {
    if (delta > 0) {
      return 0;
    }

    return count - 1;
  }

  return (current + delta + count) % count;
};
