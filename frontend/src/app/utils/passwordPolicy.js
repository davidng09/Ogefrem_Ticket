export const PASSWORD_POLICY_HINT =
  '8 caractères minimum : majuscule, minuscule, chiffre et caractère spécial (ex. @, #, !).'

export function validatePasswordClient(password) {
  if (password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule.'
  }
  if (!/\d/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre.'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial.'
  }
  return null
}
