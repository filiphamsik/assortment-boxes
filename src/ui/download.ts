export function downloadStl(buf: ArrayBuffer, name: string): void {
  const url = URL.createObjectURL(new Blob([buf], { type: 'model/stl' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
