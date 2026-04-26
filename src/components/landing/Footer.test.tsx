import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Footer from './Footer';

describe('landing/Footer', () => {
  it('renders the brand wordmark', () => {
    render(<Footer currentLang="en" onChangeLanguage={vi.fn()} />);

    expect(screen.getByText('budgard')).toBeInTheDocument();
    expect(screen.getByText('landing.footer.tagline')).toBeInTheDocument();
  });

  it('renders product links with anchor hrefs', () => {
    render(<Footer currentLang="en" onChangeLanguage={vi.fn()} />);

    const featuresLink = screen.getByText('landing.footer.product.features');
    expect(featuresLink.closest('a')).toHaveAttribute('href', '#features');
  });

  it('renders company links with placeholder hrefs', () => {
    render(<Footer currentLang="en" onChangeLanguage={vi.fn()} />);

    const privacyLink = screen.getByText('landing.footer.company.privacy');
    expect(privacyLink.closest('a')).toHaveAttribute('href', '#');
  });

  it('marks the current language as active', () => {
    render(<Footer currentLang="el" onChangeLanguage={vi.fn()} />);

    const greek = screen.getByRole('button', { name: 'Ελληνικά' });
    expect(greek.className).toContain('bg-foreground');

    const english = screen.getByRole('button', { name: 'English' });
    expect(english.className).not.toContain('bg-foreground');
  });

  it('forwards language change clicks', () => {
    const onChange = vi.fn();
    render(<Footer currentLang="en" onChangeLanguage={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ελληνικά' }));
    expect(onChange).toHaveBeenCalledWith('el');
  });

  it('renders the copyright with the current year', () => {
    render(<Footer currentLang="en" onChangeLanguage={vi.fn()} />);

    expect(screen.getByText('landing.footer.copyright')).toBeInTheDocument();
    expect(screen.getByText('landing.footer.builtIn')).toBeInTheDocument();
  });
});
