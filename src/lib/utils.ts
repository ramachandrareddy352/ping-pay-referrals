import { PublicKey } from '@solana/web3.js'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const MEA_SPL2022_MINT: PublicKey = new PublicKey('mecySk7eSawDNfAXvW3CquhLyxyKaXExFXgUUbEZE1T')
export const MEA_SPL_MINT: PublicKey = new PublicKey('MeaMMYyboH6vpRVGkQF8LkrmS5sj925UwFcaGcFcSem')

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ellipsify(str = '', len = 4, delimiter = '..') {
  const strLen = str.length
  const limit = len * 2 + delimiter.length

  return strLen >= limit ? str.substring(0, len) + delimiter + str.substring(strLen - len, strLen) : str
}
