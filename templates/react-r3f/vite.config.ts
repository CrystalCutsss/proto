import { defineVersionConfig } from '@proto/build-kit';
import { copyDecoders } from '@proto/three-kit/vite';
import react from '@vitejs/plugin-react';

export default defineVersionConfig(import.meta.dirname, { plugins: [react(), copyDecoders()] });
