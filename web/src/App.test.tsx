import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App', () => {
  it('renders the playground form', () => {
    render(<App />);
    expect(
      screen.getByText('Dynamic Icon Notification Studio'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send test push/i })).toBeInTheDocument();
  });
});
