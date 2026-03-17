// Entry point for wallet bundle — auto-mounts React wallet provider
import { mountWallet } from './WalletProvider.jsx';

// Mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountWallet());
} else {
  mountWallet();
}
