import JSZip from 'jszip';

export async function downloadProjectSourceZip(onProgress?: (percent: number) => void): Promise<void> {
  const zip = new JSZip();

  // Glob all source files, configurations, and styles using Vite's eager raw import
  const rawModules = import.meta.glob(
    [
      '/src/**/*.{ts,tsx,css}',
      '/index.html',
      '/package.json',
      '/tsconfig.json',
      '/vite.config.ts',
      '/metadata.json',
      '/.env.example'
    ],
    { query: '?raw', import: 'default', eager: true }
  ) as Record<string, string>;

  // Add a README.md for the downloaded project
  const readmeContent = `# AuraRetail Enterprise ERP & Supermarket POS
Production-grade multi-branch retail management, warehouse double-entry inventory ledger, and high-speed Point of Sale system.

## Features
- **POS Cashier Terminal**: Barcode scanning with audio cues, touch category tiles, scale/weight produce, line voids with Supervisor PIN overrides, split payments (Cash, Card, Loyalty points, Voucher), thermal receipt ESC/POS printing, and blind cash shift reconciliation (X/Z Reports).
- **Inventory Ledger**: Complete double-entry stock movement history (Purchase, Sale, Return, Transfer, Adjustment, Damage) with batch numbers and expiry tracking.
- **Multi-Branch & Warehouse**: Multi-tenant holding company, retail branches, cold rooms, and central distribution hubs.
- **Procurement & GRN**: Supplier directory, Purchase Orders with threshold approvals, and Goods Received Notes (GRN).
- **Loyalty Program**: Member points earning and POS redemption.
- **Promotions Engine**: Buy X Get Y Free, basket total discounts, and time-based campaigns.
- **Executive BI**: CEO KPIs, gross profit analysis, peak shopping traffic curve, and CSV exports.
- **Security & RBAC**: Granular permissions matrix and immutable audit trail.

## Installation & Running Locally

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Build for production
npm run build
\`\`\`

Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Lucide React.
`;

  zip.file('README.md', readmeContent);

  for (const [path, content] of Object.entries(rawModules)) {
    // Clean leading slash
    const relativePath = path.replace(/^\//, '');
    zip.file(relativePath, content);
  }

  // Generate zip blob
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  // Trigger download in browser
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AuraRetail-ERP-POS-SourceCode-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
