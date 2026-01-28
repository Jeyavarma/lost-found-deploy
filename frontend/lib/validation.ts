// Input validation schemas and functions
export const ValidationRules = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{8,128}$/
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export class Validator {
  // Validate email
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = []
    
    if (!email) {
      errors.push('Email is required')
    } else if (!ValidationRules.email.test(email)) {
      errors.push('Please enter a valid email address')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Validate password
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = []
    
    if (!password) {
      errors.push('Password is required')
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    } else if (!ValidationRules.password.test(password)) {
      errors.push('Password must contain uppercase, lowercase, number, and special character')
    } else if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Validate name
  static validateName(name: string): ValidationResult {
    const errors: string[] = []
    
    if (!name) {
      errors.push('Name is required')
    } else if (name.length < 2) {
      errors.push('Name must be at least 2 characters long')
    } else if (name.length > 50) {
      errors.push('Name must be less than 50 characters')
    } else if (!ValidationRules.name.test(name)) {
      errors.push('Name can only contain letters and spaces')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Validate item title
  static validateItemTitle(title: string): ValidationResult {
    const errors: string[] = []
    
    if (!title) {
      errors.push('Title is required')
    } else if (title.length < 3) {
      errors.push('Title must be at least 3 characters long')
    } else if (title.length > 100) {
      errors.push('Title must be less than 100 characters')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Validate item description
  static validateDescription(description: string): ValidationResult {
    const errors: string[] = []
    
    if (!description) {
      errors.push('Description is required')
    } else if (description.length < 10) {
      errors.push('Description must be at least 10 characters long')
    } else if (description.length > 1000) {
      errors.push('Description must be less than 1000 characters')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Validate location
  static validateLocation(location: string): ValidationResult {
    const errors: string[] = []
    
    if (!location) {
      errors.push('Location is required')
    } else if (location.length < 2) {
      errors.push('Location must be at least 2 characters long')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Sanitize input (prevent XSS)
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const map: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        }
        return map[match]
      })
      .trim()
  }

  // Validate complete form
  static validateItemForm(data: any): ValidationResult {
    const errors: string[] = []
    
    const titleValidation = this.validateItemTitle(data.title)
    if (!titleValidation.valid) errors.push(...titleValidation.errors)
    
    const descValidation = this.validateDescription(data.description)
    if (!descValidation.valid) errors.push(...descValidation.errors)
    
    const locationValidation = this.validateLocation(data.location)
    if (!locationValidation.valid) errors.push(...locationValidation.errors)
    
    if (!data.category) {
      errors.push('Category is required')
    }
    
    return { valid: errors.length === 0, errors }
  }
}

// Real-time validation hook
export function useValidation() {
  const validateField = (field: string, value: string) => {
    switch (field) {
      case 'email': return Validator.validateEmail(value)
      case 'password': return Validator.validatePassword(value)
      case 'name': return Validator.validateName(value)
      case 'title': return Validator.validateItemTitle(value)
      case 'description': return Validator.validateDescription(value)
      case 'location': return Validator.validateLocation(value)
      default: return { valid: true, errors: [] }
    }
  }

  return { validateField, Validator }
}