import { render, screen } from '@testing-library/react';
import App from './App';

test('renders LogIt app', () => {
  render(<App />);
  expect(screen.getByText(/LogIt/i)).toBeInTheDocument();
});
