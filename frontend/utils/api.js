export async function fetchAPI(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 10000)

  const res = await fetch(url, {
    signal: controller.signal
  })

  clearTimeout(timeout)
  return res.json()
}
