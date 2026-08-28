/** Validación visual del formulario de cita. No hay backend: solo confirma. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function initForm(): void {
  const form = document.querySelector<HTMLFormElement>('#requestForm')
  if (!form) return
  const done = form.querySelector<HTMLElement>('#formDone')

  const check = (input: HTMLInputElement): boolean => {
    const value = input.value.trim()
    let message = ''
    if (!value) {
      message = input.name === 'name'
        ? 'Necesitamos un nombre para la cita.'
        : 'Necesitamos un correo para escribirte.'
    } else if (input.name === 'email' && !EMAIL.test(value)) {
      message = 'Ese correo no parece completo.'
    }
    const field = input.closest('.field')
    const error = field?.querySelector<HTMLElement>('.field__error')
    field?.classList.toggle('is-bad', Boolean(message))
    if (error) error.textContent = message
    input.setAttribute('aria-invalid', message ? 'true' : 'false')
    return !message
  }

  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input'))
  for (const input of inputs) {
    input.addEventListener('blur', () => check(input))
    input.addEventListener('input', () => {
      if (input.closest('.field')?.classList.contains('is-bad')) check(input)
    })
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const results = inputs.map(check)
    if (results.includes(false)) {
      inputs.find((i) => i.closest('.field')?.classList.contains('is-bad'))?.focus()
      return
    }
    if (done) done.hidden = false
    form.querySelector('button')?.setAttribute('disabled', 'true')
  })
}
