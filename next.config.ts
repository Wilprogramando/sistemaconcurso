import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // o mupdf carrega WebAssembly: tem de ficar fora do empacotamento do servidor
  serverExternalPackages: ['mupdf'],

  experimental: {
    serverActions: { bodySizeLimit: '2mb' },

    // Cache de rota no navegador. Sem isso, voltar para uma tela já vista
    // refazia tudo no servidor; com isso, a volta é instantânea por 30 s.
    staleTimes: { dynamic: 30, static: 180 },

    // só o ícone usado de cada pacote entra no pacote final
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
