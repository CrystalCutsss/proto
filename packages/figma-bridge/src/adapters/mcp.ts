// Figma MCP adapter — not connected yet. TODO(connect-figma): Phase 8, only on the owner's command.
// Plan: read frames via the Figma connector (get_metadata, get_design_context, get_screenshot),
// cache responses in .cache/figma/<fileKey>/<nodeId>.json, map frames to SpecScreen.
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
        'Figma is not connected yet (TODO(connect-figma), Phase 8). Use the fixture source: design-input/.',
      ),
    );
  }
}
