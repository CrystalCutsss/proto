// Figma adapter for build-time code — not available. Figma is read only inside a Claude session through the
// claude.ai connector (skill `figma-intake`, read-only, ADR-0016): it saves references, assets and the spec into
// the version, and builds use the fixture source over those files. Reading Figma from Node/CI would need the
// Figma REST API with a token in GitHub Secrets: TODO(connect-figma-rest), see the Phase 8 checklist (ADR-0018).
import type { DesignSource, VersionSpec } from '../types.ts';

export class FigmaMcpSource implements DesignSource {
  readonly kind = 'figma' as const;
  readonly fileUrl: string;

  constructor(fileUrl: string) {
    this.fileUrl = fileUrl;
  }

  readSpec(): Promise<VersionSpec> {
    return Promise.reject(
      new Error(
        'Figma is read in the Claude session (skill figma-intake), not from build code (TODO(connect-figma-rest)). Use the fixture source: design-input/.',
      ),
    );
  }
}
