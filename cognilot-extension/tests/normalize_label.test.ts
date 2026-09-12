import { describe, it, expect } from 'vitest';
import { normalizeLabel, getCleanLabelFromQuestion } from '../src/utils/common';

describe('normalizeLabel', () => {
  it('preserves spaces in multi-word labels without squishing them', () => {
    expect(normalizeLabel('Correo electrónico')).toBe('Correo electrónico');
    expect(normalizeLabel('Carta de motivación')).toBe('Carta de motivación');
    expect(normalizeLabel('¿Cuál es tu aspiración salarial mensual?')).toBe(
      '¿Cuál es tu aspiración salarial mensual?'
    );
    expect(normalizeLabel('Indica cómo quieres que nos dirijamos a ti.')).toBe(
      'Indica cómo quieres que nos dirijamos a ti.'
    );
    expect(normalizeLabel('Experiencia laboral previa')).toBe('Experiencia laboral previa');
  });

  it('removes mandatory / required annotations while preserving word spaces', () => {
    expect(normalizeLabel('Correo electrónico (obligatorio):')).toBe('Correo electrónico');
    expect(normalizeLabel('Nombre completo [requerido]')).toBe('Nombre completo');
    expect(normalizeLabel('First Name (required)')).toBe('First Name');
    expect(normalizeLabel('Last Name {mandatory}')).toBe('Last Name');
  });

  it('removes parenthesized symbols like (*), [•], (-)', () => {
    expect(normalizeLabel('Teléfono (*)')).toBe('Teléfono');
    expect(normalizeLabel('LinkedIn [•]')).toBe('LinkedIn');
    expect(normalizeLabel('Dirección (-)')).toBe('Dirección');
    expect(normalizeLabel('Portfolio *')).toBe('Portfolio');
  });

  it('removes form platform hints and trailing punctuation', () => {
    expect(normalizeLabel('Experiencia laboral (Texto de una sola línea)')).toBe(
      'Experiencia laboral'
    );
    expect(normalizeLabel('Habilidades técnicas (Multiple line text):')).toBe(
      'Habilidades técnicas'
    );
    expect(normalizeLabel('País de residencia:')).toBe('País de residencia');
    expect(normalizeLabel('Ciudad /')).toBe('Ciudad');
    expect(normalizeLabel('Estado -')).toBe('Estado');
  });

  it('supports lowercase transformation when requested', () => {
    expect(normalizeLabel('Correo Electrónico', true)).toBe('correo electrónico');
  });

  it('handles empty and single word strings cleanly', () => {
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel('Nombre')).toBe('Nombre');
    expect(normalizeLabel('Apellidos')).toBe('Apellidos');
  });
});

describe('getCleanLabelFromQuestion', () => {
  it('extracts and cleans multi-word labels from question objects', () => {
    expect(getCleanLabelFromQuestion({ text: 'Correo electrónico (obligatorio):' })).toBe(
      'Correo electrónico'
    );
    expect(
      getCleanLabelFromQuestion({
        field: { label: '¿Cuál es tu aspiración salarial mensual?' },
      })
    ).toBe('¿Cuál es tu aspiración salarial mensual?');
    expect(
      getCleanLabelFromQuestion({
        field: { placeholder: 'Indica cómo quieres que nos dirijamos a ti' },
      })
    ).toBe('Indica cómo quieres que nos dirijamos a ti');
  });
});
