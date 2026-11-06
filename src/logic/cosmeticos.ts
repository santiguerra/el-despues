// Fase 4: cosméticos que se compran con monedas y cambian la aldea.
import type { Ranura } from '../types'

export interface Cosmetico {
  id: string
  ranura: Ranura
  nombre: string
  costo: number
  /** colores [principal, sombra] para capas, fuego y estandarte */
  colores?: [string, string]
}

export const RANURAS: Record<Ranura, string> = {
  capa: 'Capa',
  sombrero: 'Sombrero',
  mascota: 'Mascota',
  fogata: 'Fogata',
  estandarte: 'Estandarte',
}

export const COSMETICOS: Cosmetico[] = [
  { id: 'capa-cielo', ranura: 'capa', nombre: 'Capa del cielo', costo: 40, colores: ['#1cb0f6', '#1899d6'] },
  { id: 'capa-brasas', ranura: 'capa', nombre: 'Capa de brasas', costo: 40, colores: ['#ff4b4b', '#ea2b2b'] },
  { id: 'capa-arcana', ranura: 'capa', nombre: 'Capa arcana', costo: 60, colores: ['#b07cc6', '#8a55a3'] },
  { id: 'capa-real', ranura: 'capa', nombre: 'Capa real', costo: 150, colores: ['#ffc800', '#e0a800'] },
  { id: 'sombrero-sabio', ranura: 'sombrero', nombre: 'Sombrero de sabio', costo: 80 },
  { id: 'corona', ranura: 'sombrero', nombre: 'Corona del Ahora', costo: 200 },
  { id: 'mascota-gato', ranura: 'mascota', nombre: 'Gato explorador', costo: 120 },
  { id: 'mascota-cubito', ranura: 'mascota', nombre: 'Cubito, un Rubik con patas', costo: 150 },
  { id: 'fogata-azul', ranura: 'fogata', nombre: 'Fuego azul', costo: 60, colores: ['#1cb0f6', '#ddf4ff'] },
  { id: 'fogata-verde', ranura: 'fogata', nombre: 'Fuego del Ahora', costo: 60, colores: ['#58cc02', '#d7ffb8'] },
  { id: 'estandarte-oro', ranura: 'estandarte', nombre: 'Estandarte dorado', costo: 100, colores: ['#ffc800', '#fff4cc'] },
  { id: 'estandarte-rubi', ranura: 'estandarte', nombre: 'Estandarte rubí', costo: 100, colores: ['#ff4b4b', '#ffdfe0'] },
]

export const cosmetico = (id: string | undefined) => COSMETICOS.find((c) => c.id === id)
