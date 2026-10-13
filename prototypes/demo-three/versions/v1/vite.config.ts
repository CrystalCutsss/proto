import { defineVersionConfig } from '@proto/build-kit';
import { copyDecoders } from '@proto/three-kit/vite';

export default defineVersionConfig(import.meta.dirname, { plugins: [copyDecoders()] });
