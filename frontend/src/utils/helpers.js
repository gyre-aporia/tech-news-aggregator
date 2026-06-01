export const cleanHtml = (htmlString) => {
  if (!htmlString) return ''
  return htmlString.replace(/<img[^>]*>/g, '')
}