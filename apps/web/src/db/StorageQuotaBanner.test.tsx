import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StorageQuotaBanner } from './StorageQuotaBanner.js';

describe('StorageQuotaBanner', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders when usage is at or above 80%', async () => {
    render(
      <StorageQuotaBanner
        pollMs={60_000}
        estimateFn={async () => ({ usage: 90, quota: 100 })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('storage-quota-banner')).toHaveTextContent(
        '90%',
      );
    });
  });

  it('stays hidden under the threshold', async () => {
    const { container } = render(
      <StorageQuotaBanner
        estimateFn={async () => ({ usage: 10, quota: 100 })}
      />,
    );

    await waitFor(() => {
      expect(container).toBeTruthy();
    });
    expect(screen.queryByTestId('storage-quota-banner')).toBeNull();
  });
});
