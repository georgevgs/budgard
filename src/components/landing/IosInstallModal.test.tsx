import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import { IosInstallModal } from './IosInstallModal';

describe('IosInstallModal', () => {
  it('renders nothing when closed', () => {
    render(<IosInstallModal open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText('landing.install.title')).not.toBeInTheDocument();
  });

  it('renders the title and description when open', () => {
    render(<IosInstallModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('landing.install.title')).toBeInTheDocument();
    expect(screen.getByText('landing.install.description')).toBeInTheDocument();
  });

  it('renders four numbered steps when open', () => {
    render(<IosInstallModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
