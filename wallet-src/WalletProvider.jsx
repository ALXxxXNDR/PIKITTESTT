// ============================================
// RainbowKit Wallet Provider — React Component
// Bridges Web3 wallet to vanilla JS via window.WalletAPI
// ============================================

import React, { useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
  useConnectModal,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// RainbowKit config — Sepolia testnet only
const config = getDefaultConfig({
  appName: 'PIKIT',
  // WalletConnect projectId — use a demo/test ID (replace in production)
  projectId: 'b1e43662f4e81f6e5b07c0be300b259f',
  chains: [sepolia],
  ssr: false,
});

const queryClient = new QueryClient();

// ===== Inner component that exposes wallet API =====
function WalletBridge() {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  // Shorten address for display: 0x1234...abcd
  const shortenAddress = useCallback((addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  // Expose global WalletAPI for vanilla JS
  useEffect(() => {
    window.WalletAPI = {
      isConnected: () => isConnected,
      getAddress: () => address || null,
      getShortAddress: () => shortenAddress(address),

      // Open RainbowKit connect modal
      connect: () => {
        if (openConnectModal) {
          openConnectModal();
        }
      },

      // Disconnect wallet
      disconnect: () => {
        disconnect();
      },

      // Sign message for authentication
      signMessage: async (message) => {
        if (!isConnected) {
          throw new Error('Wallet not connected');
        }
        const signature = await signMessageAsync({ message });
        return signature;
      },
    };

    // Dispatch custom event when wallet state changes
    window.dispatchEvent(new CustomEvent('walletStateChanged', {
      detail: {
        isConnected,
        isConnecting,
        address: address || null,
        shortAddress: shortenAddress(address),
      },
    }));
  }, [isConnected, isConnecting, address, disconnect, signMessageAsync, openConnectModal, shortenAddress]);

  // Hidden ConnectButton for RainbowKit modal functionality
  // The actual UI trigger is in vanilla JS
  return (
    <div id="rainbowkit-connect" style={{ display: 'none' }}>
      <ConnectButton />
    </div>
  );
}

// ===== Root Provider =====
function WalletApp() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          initialChain={sepolia}
        >
          <WalletBridge />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// ===== Mount React app =====
export function mountWallet(containerId = 'wallet-mount') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[Wallet] Mount point not found:', containerId);
    return;
  }
  const root = createRoot(container);
  root.render(<WalletApp />);
  console.log('[Wallet] RainbowKit mounted on Sepolia');
}

// Auto-mount handled by wallet-entry.js
