import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function wavelengthToRgb(wavelengthNm: number): string {
  const gamma = 0.8
  let r = 0
  let g = 0
  let b = 0

  if (wavelengthNm >= 380 && wavelengthNm < 440) {
    r = -(wavelengthNm - 440) / (440 - 380)
    g = 0
    b = 1
  } else if (wavelengthNm < 490) {
    r = 0
    g = (wavelengthNm - 440) / (490 - 440)
    b = 1
  } else if (wavelengthNm < 510) {
    r = 0
    g = 1
    b = -(wavelengthNm - 510) / (510 - 490)
  } else if (wavelengthNm < 580) {
    r = (wavelengthNm - 510) / (580 - 510)
    g = 1
    b = 0
  } else if (wavelengthNm < 645) {
    r = 1
    g = -(wavelengthNm - 645) / (645 - 580)
    b = 0
  } else if (wavelengthNm <= 780) {
    r = 1
    g = 0
    b = 0
  }

  let factor = 0
  if (wavelengthNm >= 380 && wavelengthNm < 420) {
    factor = 0.3 + (0.7 * (wavelengthNm - 380)) / (420 - 380)
  } else if (wavelengthNm <= 700) {
    factor = 1
  } else if (wavelengthNm <= 780) {
    factor = 0.3 + (0.7 * (780 - wavelengthNm)) / (780 - 700)
  }

  const R = Math.round(255 * Math.pow(r * factor, gamma))
  const G = Math.round(255 * Math.pow(g * factor, gamma))
  const B = Math.round(255 * Math.pow(b * factor, gamma))
  return `rgb(${R},${G},${B})`
}
