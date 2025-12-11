import { Component, Inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { CrateRecord } from '../../../../core/models/crate.model';

@Component({
    selector: 'app-crate-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatRadioModule
    ],
    templateUrl: './crate-dialog.html',
    styleUrls: ['./crate-dialog.scss']
})
export class CrateDialogComponent {
    form: FormGroup;
    mode = signal<'create' | 'edit' | 'transaction'>('create');
    transactionType = signal<'borrow' | 'return'>('borrow');

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<CrateDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { 
            record?: CrateRecord, 
            mode?: 'create' | 'edit' | 'transaction',
            transactionType?: 'borrow' | 'return'
        }
    ) {
        this.mode.set(data.mode || 'create');
        if (data.transactionType) {
            this.transactionType.set(data.transactionType);
        }

        if (this.mode() === 'transaction') {
            this.form = this.fb.group({
                amount: [1, [Validators.required, Validators.min(1)]]
            });
        } else if (this.mode() === 'edit') {
            this.form = this.fb.group({
                customerName: [data.record?.customerName, Validators.required]
            });
        } else {
            this.form = this.fb.group({
                customerName: ['', Validators.required],
                amount: [0, [Validators.required, Validators.min(0)]]
            });
        }
    }

    save() {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        }
    }
}
