import { describe, it, expect } from 'vitest';
import { createAurArchive, parseAurOrJson } from '../../src/core/aur-file-system';
import { createModernStudioTemplate } from '../../src/core/templates';

describe('.aur Native File System Container', () => {
  it('creates an .aur container with correct specification headers and stats', () => {
    const template = createModernStudioTemplate();
    template.name = 'Penthouse Loft';

    const archive = createAurArchive(template, 'https://res.cloudinary.com/test.jpg');
    expect(archive.format).toBe('AURABIM_CONTAINER');
    expect(archive.version).toBe('1.0');
    expect(archive.fileExtension).toBe('.aur');
    expect(archive.meta.name).toBe('Penthouse Loft');
    expect(archive.meta.generator).toContain('AuraBIM');
    expect(archive.meta.stats.wallCount).toBeGreaterThan(0);
    expect(archive.meta.thumbnailUrl).toBe('https://res.cloudinary.com/test.jpg');
    expect(archive.projectState.nodes).toBeDefined();
    expect(archive.checksum).toMatch(/^aur_/);
  });

  it('correctly parses native .aur archive file contents', () => {
    const template = createModernStudioTemplate();
    const archive = createAurArchive(template);
    const serialized = JSON.stringify(archive);

    const result = parseAurOrJson(serialized);
    expect(result.isAur).toBe(true);
    expect(result.state.name).toBe(template.name);
    expect(result.meta?.stats.wallCount).toBe(Object.keys(template.walls).length);
  });

  it('retains backward compatibility for legacy raw ProjectState JSON files', () => {
    const template = createModernStudioTemplate();
    const rawJson = JSON.stringify(template);

    const result = parseAurOrJson(rawJson);
    expect(result.isAur).toBe(false);
    expect(result.state.nodes).toBeDefined();
    expect(result.state.walls).toBeDefined();
  });

  it('throws descriptive error on malformed or invalid files', () => {
    expect(() => parseAurOrJson('{}')).toThrowError(/Unrecognized format/);
    expect(() => parseAurOrJson('{"foo": "bar"}')).toThrowError(/Unrecognized format/);
  });
});
