const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * Текстовые метаданные PNG (чанки `tEXt`: ключ → значение в Latin-1). Mapper кладёт туда
 * координаты углов карты (`mapTopLeftLat=…` и т. д.), чтобы при выборе файла их не нужно было
 * вставлять вручную.
 *
 * Читаются только заголовочные чанки до первого `IDAT` — mapper (Qt/libpng) пишет текст перед
 * данными картинки, поэтому многомегабайтный файл целиком не загружается. Сжатые `zTXt`/`iTXt`
 * не разбираются: mapper пишет короткие значения, а их Qt всегда сохраняет несжатыми `tEXt`.
 * Не PNG или битый файл → пустой объект.
 */
export async function readPngTextChunks(file: Blob): Promise<Record<string, string>> {
  const texts: Record<string, string> = {}
  const read = async (start: number, length: number) =>
    new Uint8Array(await file.slice(start, start + length).arrayBuffer())

  const signature = await read(0, PNG_SIGNATURE.length)
  if (!PNG_SIGNATURE.every((byte, i) => signature[i] === byte)) return texts

  const latin1 = new TextDecoder('latin1')
  let offset = PNG_SIGNATURE.length
  while (offset + 8 <= file.size) {
    const header = await read(offset, 8)
    const length = new DataView(header.buffer).getUint32(0)
    const type = latin1.decode(header.subarray(4, 8))
    if (type === 'IDAT' || type === 'IEND') break
    if (type === 'tEXt') {
      const data = await read(offset + 8, length)
      const separator = data.indexOf(0)
      if (separator > 0)
        texts[latin1.decode(data.subarray(0, separator))] = latin1.decode(data.subarray(separator + 1))
    }
    offset += 8 + length + 4 // заголовок + данные + CRC
  }
  return texts
}
