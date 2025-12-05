import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function atLeastOneContactValidator(emailControlName: string = 'email', phoneControlName: string = 'phone'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const emailControl = control.get(emailControlName);
        const phoneControl = control.get(phoneControlName);

        if (!emailControl || !phoneControl) {
            return null; // Controls not found, skip validation or handle error
        }

        const email = emailControl.value;
        const phone = phoneControl.value;

        // Check if at least one has a value
        const hasEmail = email && String(email).trim().length > 0;
        const hasPhone = phone && String(phone).trim().length > 0;

        if (!hasEmail && !hasPhone) {
            // Return error on the group
            return { atLeastOneContact: true };
        }

        // Clear error if valid? 
        // Validators on FormGroup return null if valid, or error object if invalid.
        // We don't need to manually clear errors on controls unless we set them manually.

        return null;
    };
}
